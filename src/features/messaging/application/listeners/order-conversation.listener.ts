import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { EnrichedDomainEvent } from '../../../../shared/events/event-bus.service.js';
import type { OrderStatusChangedEvent } from '../../../../shared/events/order.events.js';

type EventType = EnrichedDomainEvent<OrderStatusChangedEvent>;

/**
 * Human-readable timeline labels for each order status transition.
 * The initial REQUESTED status (oldStatus === null) is intentionally omitted —
 * the order's existence is already visible in the conversation via the order card.
 */
const STATUS_TIMELINE_CONTENT: Record<string, string> = {
  ACCEPTED: '✅ Order accepted — the seller is preparing your order.',
  DECLINED: '❌ Order declined by the seller.',
  FULFILLING: '📦 Order is now being fulfilled.',
  COMPLETION_REQUESTED: "🏁 Completion requested — awaiting the other party's confirmation.",
  COMPLETED: '✓ Order completed. Thank you!',
  CANCELLED: '🚫 Order cancelled.',
};

/**
 * Listens to `order.status.changed` domain events and, when the order has an
 * associated conversation, inserts a system timeline message so both parties
 * can see the order lifecycle directly in the chat.
 *
 * The message is posted under the first participant in the conversation
 * (database constraint requires a non-null participantId), but is attributed
 * to `senderDisplayName = 'Oríta'` so the UI can render it as a system event.
 */
@Injectable()
export class OrderConversationListener {
  private readonly logger = new Logger(OrderConversationListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('order.status.changed', { async: true })
  async handle(event: EventType): Promise<void> {
    const { orderId, conversationId, newStatus } = event.data;

    if (!conversationId) return;

    const content = STATUS_TIMELINE_CONTENT[newStatus];
    if (!content) return; // No timeline message for the initial REQUESTED status

    try {
      // Resolve the first participant in the conversation.
      // The Message table requires a participantId; we use the first participant
      // as a structural placeholder while attributing the message to 'Oríta'.
      const cp = await this.prisma.conversationParticipant.findFirst({
        where: { conversationId },
        select: { participantId: true },
      });

      if (!cp) {
        this.logger.warn(
          `OrderConversationListener: no participants found for conversation ${conversationId} (order ${orderId})`,
        );
        return;
      }

      await this.prisma.message.create({
        data: {
          conversationId,
          participantId: cp.participantId,
          senderDisplayName: 'Oríta',
          senderAvatarUrl: null,
          content,
        },
      });

      this.logger.debug(
        `Posted system order message for order ${orderId} → conversation ${conversationId} [${newStatus}]`,
      );
    } catch (err) {
      // Non-fatal — log and continue. Notification delivery is independent.
      this.logger.error(`Failed to post system order message for order ${orderId}: ${String(err)}`);
    }
  }
}
