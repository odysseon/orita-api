import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import type { IOrderRepository } from '../../core/domain/order.ports.js';
import { OrderStateMachine } from '../../core/state-machine/order-state-machine.js';
import { OrderSubjectHelper } from '../helpers/order-subject.helper.js';
import { OrderRecipientHelper } from '../helpers/order-recipient.helper.js';
import { CreateOrderDto } from '../../api/dto/create-order.dto.js';
import { Order, OrderActorRole, OrderStatus } from '../../core/domain/order.types.js';

@Injectable()
export class OrderService {
  constructor(
    @Inject('IOrderRepository')
    private readonly orderRepository: IOrderRepository,
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

    return this.orderRepository.create({
      ...subjectFields,
      ...recipientFields,
      buyerId: actorId,
      buyerBusinessId: null,
      conversationId: dto.conversationId || null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      quantity: (dto.quantity as any) ?? 1,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      agreedPrice: (dto.agreedPrice as any) ?? null,
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
    const timestamps: Partial<Order> = {};
    if (timestampField) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (timestamps as any)[timestampField] = new Date();
    }
    if (newStatus === 'COMPLETION_REQUESTED') {
      timestamps.completionRequestedById = actorId;
    }

    return this.orderRepository.updateStatus(orderId, newStatus, timestamps);
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }
}
