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
   * Leases a batch of unpublished events for processing by setting an exclusive owner and expiry.
   */
  async leaseNextBatch(
    batchSize: number,
    leaseDurationMs: number,
    dispatcherId: string,
  ): Promise<OutboxEvent[]> {
    // We use a single atomic UPDATE ... RETURNING to safely lock and lease events in one go.
    return this.prisma.$queryRaw<OutboxEvent[]>`
      UPDATE "outbox_events"
      SET "leasedBy" = ${dispatcherId},
          "leasedUntil" = NOW() + (${leaseDurationMs} * interval '1 millisecond')
      WHERE id IN (
        SELECT id FROM "outbox_events"
        WHERE "publishedAt" IS NULL
          AND "deadLetteredAt" IS NULL
          AND "availableAt" <= NOW()
          AND ("leasedUntil" IS NULL OR "leasedUntil" < NOW())
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;
  }

  /**
   * Marks an event as successfully published and clears the lease.
   */
  async markAsPublished(id: string, dispatcherId: string): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: {
        id,
        leasedBy: dispatcherId,
        publishedAt: null,
      },
      data: {
        publishedAt: new Date(),
        leasedBy: null,
        leasedUntil: null,
      },
    });
  }

  /**
   * Marks an event as failed, implements backoff, handles dead-lettering, and clears the lease.
   */
  async releaseLeaseWithRetry(
    id: string,
    nextAvailableAt: Date,
    dispatcherId: string,
    isDeadLetter = false,
  ): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: {
        id,
        leasedBy: dispatcherId,
        publishedAt: null,
      },
      data: {
        failedAt: new Date(),
        retryCount: { increment: 1 },
        availableAt: nextAvailableAt,
        leasedBy: null,
        leasedUntil: null,
        deadLetteredAt: isDeadLetter ? new Date() : null,
      },
    });
  }
}
