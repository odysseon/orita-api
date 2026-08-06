import { Order, OrderStatus } from '../domain/order.types.js';

export interface IOrderRepository {
  create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  updateStatus(
    id: string,
    status: OrderStatus,
    timestamps: Partial<
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
    >,
  ): Promise<Order>;
  updateConversationId(orderId: string, conversationId: string): Promise<Order>;
}
