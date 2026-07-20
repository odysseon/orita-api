import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { NotificationsGateway } from '../../api/gateways/notifications.gateway.js';
import { NotificationPresenter } from '../../application/presenters/notification.presenter.js';

@Injectable()
@Processor('in_app_delivery_queue')
export class InAppWorker extends WorkerHost {
  private readonly logger = new Logger(InAppWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
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
      this.logger.warn(`[InAppWorker] Notification ${notificationId} not found`);
      return;
    }

    const notificationView = this.presenter.toInAppDto(notification);
    this.gateway.broadcastNotification(userId, notificationView);

    this.logger.log(`[InAppWorker] Broadcast In-App notification for user ${userId}`);
  }
}
