import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OutboxEvent, Prisma } from '../../../generated/prisma/client.js';

export type CreateOutboxEventData = Omit<
  Prisma.OutboxEventCreateInput,
  'id' | 'occurredAt' | 'availableAt' | 'publishedAt' | 'failedAt' | 'retryCount' | 'createdAt'
>;

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an event to the outbox.
   * This operation automatically participates in the active Unit of Work
   * because PrismaService transparently proxies to the AsyncLocalStorage transaction.
   */
  async append(data: CreateOutboxEventData): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.create({
      data: data,
    });
  }

  /**
   * Retrieves unpublished events that are ready to be published.
   * Uses FOR UPDATE SKIP LOCKED to prevent concurrent dispatchers from processing the same events.
   */
  async getUnpublishedEvents(batchSize = 100): Promise<OutboxEvent[]> {
    // Note: Prisma does not natively support SKIP LOCKED in findMany.
    // We must use raw SQL for safe concurrent polling.
    return this.prisma.$queryRaw<OutboxEvent[]>`
      SELECT * FROM "outbox_events"
      WHERE "publishedAt" IS NULL
        AND "availableAt" <= NOW()
      ORDER BY "createdAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;
  }

  /**
   * Marks events as successfully published.
   */
  async markAsPublished(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.outboxEvent.updateMany({
      where: { id: { in: ids } },
      data: { publishedAt: new Date() },
    });
  }

  /**
   * Marks an event as failed and increments its retry count.
   */
  async markAsFailed(id: string, nextAvailableAt: Date): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        failedAt: new Date(),
        retryCount: { increment: 1 },
        availableAt: nextAvailableAt,
      },
    });
  }
}
