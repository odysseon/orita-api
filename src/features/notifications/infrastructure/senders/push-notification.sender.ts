import { Injectable, Logger } from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { PushSubscription } from '../../../../../generated/prisma/client.js';
import { PushNotificationDto } from '../../application/presenters/notification.presenter.js';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../configs/validation.js';

@Injectable()
export class PushNotificationSender {
  private readonly logger = new Logger(PushNotificationSender.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    const publicKey = this.config.get('VAPID_PUBLIC_KEY', { infer: true });
    const privateKey = this.config.get('VAPID_PRIVATE_KEY', { infer: true });
    const subject = this.config.get('VAPID_SUBJECT', { infer: true }) || 'mailto:support@orita.com';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      this.logger.warn('VAPID keys not configured, push notifications will fail');
    }
  }

  async sendToSubscriptions(
    subscriptions: PushSubscription[],
    payload: PushNotificationDto,
  ): Promise<void> {
    const payloadString = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payloadString,
        ),
      ),
    );

    const endpointsToDelete: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason as { statusCode?: number };
        // 410 Gone or 404 Not Found means the subscription is expired/invalid
        if (error && (error.statusCode === 410 || error.statusCode === 404)) {
          const sub = subscriptions[index];
          if (sub) {
            endpointsToDelete.push(sub.endpoint);
          }
        } else {
          this.logger.error('Failed to send push notification', JSON.stringify(error));
        }
      }
    });

    if (endpointsToDelete.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: {
          endpoint: { in: endpointsToDelete },
        },
      });
      this.logger.log(`Cleaned up ${endpointsToDelete.length} stale push subscriptions`);
    }
  }
}
