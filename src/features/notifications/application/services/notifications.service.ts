import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { NotificationPresenter } from '../presenters/notification.presenter.js';
import { NotificationViewDto, PaginatedNotificationsDto } from '../../api/dto/response.dto.js';
import { Prisma } from '../../../../../generated/prisma/client.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presenter: NotificationPresenter,
  ) {}

  async getPaginated(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PaginatedNotificationsDto> {
    const take = limit + 1; // fetch one extra to check if there are more

    const query: Prisma.InAppNotificationFindManyArgs = {
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    };

    if (cursor) {
      query.cursor = { id: cursor };
      // skip the cursor itself
      query.skip = 1;
    }

    const notifications = await this.prisma.inAppNotification.findMany(query);

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    const result: PaginatedNotificationsDto = {
      items: this.presenter.presentMany(items),
      hasMore,
    };

    if (nextCursor) {
      result.nextCursor = nextCursor;
    }

    return result;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.inAppNotification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationViewDto> {
    const notification = await this.prisma.inAppNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.readAt) {
      return this.presenter.present(notification); // already read
    }

    const updated = await this.prisma.inAppNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return this.presenter.present(updated);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.inAppNotification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }
}
