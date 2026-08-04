import { Injectable } from '@nestjs/common';
import { InAppNotification } from '../../../../../generated/prisma/client.js';
import { NotificationViewDto } from '../../api/dto/response.dto.js';

export interface PushNotificationDto {
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data: {
      notificationId: string;
      type: string;
      onActionClick: {
        default: {
          operation: 'focusLastFocusedOrOpen' | 'openWindow';
          url?: string;
        };
      };
    };
  };
}

@Injectable()
export class NotificationPresenter {
  private format(entity: InAppNotification) {
    const payload = (entity.payload as Record<string, unknown>) || {};

    let title = 'New Notification';
    let subtitle: string | undefined = undefined;
    let icon = 'lucideBell';
    let actionUrl = undefined;

    switch (entity.type) {
      case 'NEW_LISTING':
        title = `New listing from ${typeof payload['businessName'] === 'string' ? payload['businessName'] : 'a business near you'}`;
        subtitle = typeof payload['listingTitle'] === 'string' ? payload['listingTitle'] : '';
        icon = 'lucideTag';
        if (entity.referenceId) {
          actionUrl = `/l/${entity.referenceId}`;
        }
        break;
      case 'MESSAGE_RECEIVED':
        title =
          typeof payload['senderDisplayName'] === 'string'
            ? payload['senderDisplayName']
            : 'New Message';
        subtitle =
          typeof payload['notificationPreview'] === 'string'
            ? payload['notificationPreview']
            : 'Sent a message';
        icon = 'lucideMessageSquare';
        if (entity.referenceId) {
          actionUrl = `/messages/${entity.referenceId}`;
        }
        break;
    }

    return { title, subtitle, icon, actionUrl };
  }

  toInAppDto(entity: InAppNotification): NotificationViewDto {
    const { title, subtitle, icon, actionUrl } = this.format(entity);

    const result: NotificationViewDto = {
      id: entity.id,
      category: entity.preferenceCategory,
      title,
      isRead: entity.readAt !== null,
      createdAt: entity.createdAt,
    };

    if (subtitle) result.subtitle = subtitle;
    if (icon) result.icon = icon;
    if (actionUrl) result.actionUrl = actionUrl;

    return result;
  }

  toPushDto(entity: InAppNotification): PushNotificationDto {
    const { title, subtitle, icon, actionUrl } = this.format(entity);
    return {
      notification: {
        title,
        body: subtitle || '',
        ...(icon ? { icon: `/assets/icons/${icon}.png` } : {}),
        badge: '/assets/icons/badge.png',
        data: {
          notificationId: entity.id,
          type: entity.type,
          onActionClick: {
            default: {
              operation: 'focusLastFocusedOrOpen',
              ...(actionUrl ? { url: actionUrl } : {}),
            },
          },
        },
      },
    };
  }

  toInAppDtoMany(entities: InAppNotification[]): NotificationViewDto[] {
    return entities.map((e) => this.toInAppDto(e));
  }
}
