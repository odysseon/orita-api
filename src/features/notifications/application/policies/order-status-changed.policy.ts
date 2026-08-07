import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BaseNotificationPolicy, NotificationUrgency, NotificationPayload } from './base.policy.js';
import { NotificationEngine } from '../engine/notification.engine.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { EnrichedDomainEvent } from '../../../../shared/events/event-bus.service.js';
import type { OrderStatusChangedEvent } from '../../../../shared/events/order.events.js';

type EventType = EnrichedDomainEvent<OrderStatusChangedEvent>;

/**
 * Maps an order status to the notification type string stored in InAppNotification.type.
 */
const STATUS_TO_NOTIFICATION_TYPE: Record<string, string> = {
  REQUESTED: 'ORDER_REQUESTED',
  ACCEPTED: 'ORDER_ACCEPTED',
  DECLINED: 'ORDER_DECLINED',
  CANCELLED: 'ORDER_CANCELLED',
  FULFILLING: 'ORDER_FULFILLING',
  COMPLETION_REQUESTED: 'ORDER_COMPLETION_REQUESTED',
  COMPLETED: 'ORDER_COMPLETED',
};

/**
 * Resolves who should be notified for each order status.
 *
 * Rule of thumb:
 *  - The party that CAUSED the transition is NOT notified (they already know).
 *  - The OPPOSITE party is notified.
 *  - For ambiguous transitions (CANCELLED, COMPLETED) both parties receive a confirmation.
 */
const STATUS_TO_NOTIFIED_PARTY: Record<string, 'BUYER' | 'SELLER' | 'BOTH'> = {
  REQUESTED: 'SELLER', // buyer placed order → notify seller
  ACCEPTED: 'BUYER', // seller accepted → notify buyer
  DECLINED: 'BUYER', // seller declined → notify buyer
  FULFILLING: 'BUYER', // seller started fulfilling → notify buyer
  COMPLETION_REQUESTED: 'BUYER', // seller/buyer requested completion → notify other party (use BUYER as safe default)
  COMPLETED: 'BOTH', // completion confirmed → notify both
  CANCELLED: 'BOTH', // either party cancelled → notify both
};

@Injectable()
export class OrderStatusChangedPolicy extends BaseNotificationPolicy<EventType> {
  constructor(
    private readonly engine: NotificationEngine,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  @OnEvent('order.status.changed', { async: true })
  async handle(event: EventType): Promise<void> {
    // Skip the initial REQUESTED event here — the seller is notified via a separate dedicated
    // check, but you could include it by removing this guard.
    await this.engine.process(this, event);
  }

  isEligible(event: EventType): boolean {
    // We have a notification for every status except the very first REQUESTED
    // (oldStatus === null means the order was just created).
    // Keep REQUESTED notifications — sellers need to know immediately.
    return STATUS_TO_NOTIFICATION_TYPE[event.data.newStatus] !== undefined;
  }

  async resolveAudience(event: EventType): Promise<string[]> {
    const { buyerId, sellerUserId, sellerBusinessId, newStatus } = event.data;
    const party = STATUS_TO_NOTIFIED_PARTY[newStatus] ?? 'BOTH';
    const audience: string[] = [];

    if (party === 'BUYER' || party === 'BOTH') {
      audience.push(buyerId);
    }
    if (party === 'SELLER' || party === 'BOTH') {
      if (sellerUserId) {
        audience.push(sellerUserId);
      } else if (sellerBusinessId) {
        const business = await this.prisma.businessProfile.findUnique({
          where: { id: sellerBusinessId },
          select: { ownerId: true },
        });
        if (business?.ownerId) {
          audience.push(business.ownerId);
        }
      }
    }

    return [...new Set(audience)];
  }

  getUrgency(): NotificationUrgency {
    return NotificationUrgency.URGENT;
  }

  getPreferenceCategory(): string {
    return 'orders';
  }

  getPayload(event: EventType): NotificationPayload {
    const { orderId, newStatus, buyerId, listingId, opportunityId } = event.data;
    const type = STATUS_TO_NOTIFICATION_TYPE[newStatus] ?? `ORDER_${newStatus}`;

    return {
      type,
      actorId: buyerId,
      referenceType: 'ORDER',
      referenceId: orderId,
      payload: {
        orderId,
        status: newStatus,
        ...(listingId ? { listingId } : {}),
        ...(opportunityId ? { opportunityId } : {}),
      },
    };
  }
}
