import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { PushNotificationSender } from '../senders/push-notification.sender.js';
import { NotificationPresenter } from '../../application/presenters/notification.presenter.js';

@Injectable()
@Processor('push_delivery_queue')
export class PushWorker extends WorkerHost {
  private readonly logger = new Logger(PushWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushSender: PushNotificationSender,
    private readonly presenter: NotificationPresenter,
  ) {
    super();
  }

  async process(job: Job<{ userId: string; notificationId: string }>): Promise<void> {
    const { userId, notificationId } = job.data;

    const notification = await this.prisma.inAppNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn(`[PushWorker] Notification ${notificationId} not found`);
      return;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return;
    }

    const pushPayload = this.presenter.toPushDto(notification);

    await this.pushSender.sendToSubscriptions(subscriptions, pushPayload);
    this.logger.log(`[PushWorker] Sent Push Notification to user ${userId}`);
  }
}
