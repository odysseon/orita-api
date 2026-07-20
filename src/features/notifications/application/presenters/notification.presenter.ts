import { Injectable } from '@nestjs/common';
import { InAppNotification } from '../../../../../generated/prisma/client.js';
import { NotificationViewDto } from '../../api/dto/response.dto.js';

@Injectable()
export class NotificationPresenter {
  present(entity: InAppNotification): NotificationViewDto {
    const payload = (entity.payload as Record<string, unknown>) || {};

    let title: string;
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
      // Add other cases as needed
      default:
        title = 'New Notification';
        break;
    }

    const result: NotificationViewDto = {
      id: entity.id,
      category: entity.category,
      title,
      isRead: entity.readAt !== null,
      createdAt: entity.createdAt,
    };

    if (subtitle) result.subtitle = subtitle;
    if (icon) result.icon = icon;
    if (actionUrl) result.actionUrl = actionUrl;

    return result;
  }

  presentMany(entities: InAppNotification[]): NotificationViewDto[] {
    return entities.map((e) => this.present(e));
  }
}
