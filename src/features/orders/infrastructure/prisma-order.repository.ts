import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { IOrderRepository } from '../core/domain/order.ports.js';
import { Order, OrderStatus } from '../core/domain/order.types.js';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    return this.prisma.order.create({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: orderData as any,
    });
  }

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }

  async updateStatus(
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
  ): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: {
        status,
        ...timestamps,
      },
    });
  }

  async updateConversationId(orderId: string, conversationId: string): Promise<Order> {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { conversationId },
    });
  }
}
