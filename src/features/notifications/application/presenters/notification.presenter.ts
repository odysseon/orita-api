import { Injectable } from '@nestjs/common';
import { InAppNotification } from '../../../../../generated/prisma/client.js';
import { NotificationViewDto } from '../../api/dto/response.dto.js';

@Injectable()
export class NotificationPresenter {
  present(entity: InAppNotification): NotificationViewDto {
    const payload = entity.payload as Record<string, any> || {};

    let title = 'New Notification';
    let subtitle = undefined;
    let icon = 'lucideBell';
    let actionUrl = undefined;

    switch (entity.type) {
      case 'NEW_LISTING':
        title = `New listing from ${payload['businessName'] || 'a business near you'}`;
        subtitle = payload['listingTitle'];
        icon = 'lucideTag';
        if (entity.referenceId) {
          actionUrl = `/l/${entity.referenceId}`;
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
