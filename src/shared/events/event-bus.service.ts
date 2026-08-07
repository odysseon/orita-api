import { Injectable, Logger } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository.js';
import { Prisma } from '../../../generated/prisma/client.js';

export interface DomainEventMetadata {
  version: number;
  occurredAt: string;
}

export interface EnrichedDomainEvent<TData = unknown, TContext = Record<string, unknown>> {
  metadata: DomainEventMetadata;
  data: TData;
  context?: TContext;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly outboxRepository: OutboxRepository) {}

  /**
   * Records a domain event into the transactional outbox.
   * This is guaranteed to be saved in the same database transaction as the domain entity
   * assuming the caller is wrapped in the TransactionManager Unit of Work.
   *
   * @param eventName The name of the event (e.g. 'business.created', 'listing.published')
   * @param data The event payload data
   * @param context Optional event-specific context (e.g., location, categories) to prevent consumer queries
   * @param version The version of the event schema (defaults to 1)
   */
  async publish<TData extends object, TContext = unknown>(
    eventName: string,
    data: TData,
    context?: TContext,
    version: number = 1,
  ): Promise<void> {
    const aggregateType = eventName.split('.')[0] || 'Unknown';
    // Attempt to guess the aggregate ID from standard conventions in our events, e.g. orderId for 'order.status.changed'
    // Fallback to data['id'] or a random string (although events should ideally define the aggregateId)
    const aggregateIdProp = `${aggregateType}Id`;
    const dataAsRecord = data as Record<string, unknown>;
    const aggregateId = String(
      (dataAsRecord[aggregateIdProp] as string | number) ||
        (dataAsRecord['id'] as string | number) ||
        'unknown',
    );

    try {
      await this.outboxRepository.append({
        stream: aggregateType,
        aggregateType,
        aggregateId,
        eventType: eventName,
        eventVersion: version,
        payload: data,
        metadata: context ? context : Prisma.JsonNull,
      });

      this.logger.debug(`Recorded domain event ${eventName} v${version} to outbox`);
    } catch (error) {
      this.logger.error(`Failed to record domain event ${eventName} to outbox`, error);
      throw error;
    }
  }
}
