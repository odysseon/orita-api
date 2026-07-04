import { Injectable } from '@nestjs/common';
import { NotificationUrgency } from '../policies/base.policy.js';

export enum DeliveryChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

@Injectable()
export class ChannelRouterService {
  /**
   * Maps an urgency level to a set of delivery channels.
   * This is where the core channel routing logic lives.
   */
  route(urgency: NotificationUrgency): DeliveryChannel[] {
    switch (urgency) {
      case NotificationUrgency.URGENT:
        return [DeliveryChannel.PUSH, DeliveryChannel.IN_APP, DeliveryChannel.EMAIL];

      case NotificationUrgency.NORMAL:
        // Push and In-App, but not Email right away (Email would be digest later)
        return [DeliveryChannel.PUSH, DeliveryChannel.IN_APP];

      case NotificationUrgency.DIGEST:
        return [DeliveryChannel.EMAIL];

      default:
        return [DeliveryChannel.IN_APP];
    }
  }
}
