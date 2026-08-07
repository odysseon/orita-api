import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { IOrderRepository } from '../core/domain/order.ports.js';
import { Order, OrderStatus } from '../core/domain/order.types.js';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    return this.prisma.order.create({
      data: orderData,
    });
  }

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }

  async findByIdAndActor(id: string, actorId: string): Promise<Order | null> {
    return this.prisma.order.findFirst({
      where: {
        id,
        OR: [
          { buyerId: actorId },
          { sellerUserId: actorId },
          { buyerBusiness: { ownerId: actorId } },
          { sellerBusiness: { ownerId: actorId } },
        ],
      },
    });
  }

  async updateStatus(
    id: string,
    expectedStatus: OrderStatus,
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
    const result = await this.prisma.order.updateMany({
      where: { id, status: expectedStatus },
      data: {
        status,
        ...timestamps,
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Order status transition failed due to conflict');
    }

    return this.prisma.order.findUniqueOrThrow({
      where: { id },
    });
  }

  async updateConversationId(orderId: string, conversationId: string): Promise<Order> {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { conversationId },
    });
  }
}
