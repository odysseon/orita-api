import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client.js';
import type { IOrderRepository } from '../../core/domain/order.ports.js';
import { OrderStateMachine } from '../../core/state-machine/order-state-machine.js';
import { OrderSubjectHelper } from '../helpers/order-subject.helper.js';
import { OrderRecipientHelper } from '../helpers/order-recipient.helper.js';
import { CreateOrderDto } from '../../api/dto/create-order.dto.js';
import { Order, OrderActorRole, OrderStatus } from '../../core/domain/order.types.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import type { OrderStatusChangedEvent } from '../../../../shared/events/order.events.js';

@Injectable()
export class OrderService {
  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepository: IOrderRepository,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Creates a new order.
   * Note: The conversation is not created here. If one is needed, ConversationService.ensureConversationForOrder is called by the caller.
   */
  async createOrder(actorId: string, dto: CreateOrderDto): Promise<Order> {
    OrderSubjectHelper.validate(dto.subject);
    OrderRecipientHelper.validate(dto.recipient);

    const subjectFields = OrderSubjectHelper.toDatabaseFields(dto.subject);
    const recipientFields = OrderRecipientHelper.toDatabaseFields(dto.recipient);

    const order = await this.orderRepository.create({
      ...subjectFields,
      ...recipientFields,
      buyerId: actorId,
      buyerBusinessId: null,
      conversationId: dto.conversationId || null,
      quantity: new Prisma.Decimal(dto.quantity ?? 1),
      agreedPrice: dto.agreedPrice != null ? new Prisma.Decimal(dto.agreedPrice) : null,
      currency: dto.currency ?? 'NGN',
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      note: dto.note || null,
      status: 'REQUESTED',
      requestedAt: new Date(),
      acceptedAt: null,
      fulfillingAt: null,
      completionRequestedAt: null,
      completionRequestedById: null,
      completedAt: null,
      cancelledAt: null,
      declinedAt: null,
    });

    const event: OrderStatusChangedEvent = {
      orderId: order.id,
      buyerId: order.buyerId,
      sellerUserId: order.sellerUserId,
      sellerBusinessId: order.sellerBusinessId,
      oldStatus: null,
      newStatus: order.status,
      listingId: order.listingId,
      opportunityId: order.opportunityId,
      conversationId: order.conversationId,
    };
    await this.eventBus.publish('order.status.changed', event);

    return order;
  }

  /**
   * Transitions an order to a new status.
   */
  async transitionStatus(actorId: string, orderId: string, newStatus: OrderStatus): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Determine role (simplified: if actor is buyerId => BUYER, else SELLER)
    // Real implementation should also check buyerBusinessId and sellerBusinessId if actor acts via business
    let role: OrderActorRole;
    if (order.buyerId === actorId) {
      role = 'BUYER';
    } else if (order.sellerUserId === actorId) {
      role = 'SELLER';
    } else {
      // Need to check business ownership, simplified here:
      // If we don't know, we reject.
      throw new BadRequestException('Actor is not authorized to transition this order');
    }

    OrderStateMachine.assertTransition(order.status, newStatus, role);

    const timestampField = OrderStateMachine.getTimestampField(newStatus);
    type OrderTimestamps = Partial<
      Pick<
        Order,
        | 'acceptedAt'
        | 'fulfillingAt'
        | 'completionRequestedAt'
        | 'completedAt'
        | 'cancelledAt'
        | 'declinedAt'
        | 'completionRequestedById'
      >
    >;
    const timestamps: OrderTimestamps = {};
    if (timestampField) {
      Object.assign(timestamps, { [timestampField]: new Date() });
    }
    if (newStatus === 'COMPLETION_REQUESTED') {
      timestamps.completionRequestedById = actorId;
    }

    const updatedOrder = await this.orderRepository.updateStatus(orderId, newStatus, timestamps);

    const event: OrderStatusChangedEvent = {
      orderId: updatedOrder.id,
      buyerId: updatedOrder.buyerId,
      sellerUserId: updatedOrder.sellerUserId,
      sellerBusinessId: updatedOrder.sellerBusinessId,
      oldStatus: order.status,
      newStatus: updatedOrder.status,
      listingId: updatedOrder.listingId,
      opportunityId: updatedOrder.opportunityId,
      conversationId: updatedOrder.conversationId,
    };
    await this.eventBus.publish('order.status.changed', event);

    return updatedOrder;
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }
}
