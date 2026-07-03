import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface DomainEventMetadata {
  version: number;
  occurredAt: string;
}

export interface EnrichedDomainEvent<TData = any, TContext = Record<string, unknown>> {
  metadata: DomainEventMetadata;
  data: TData;
  context?: TContext;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(@InjectQueue('domain-events') private readonly eventQueue: Queue) {}

  /**
   * Publishes an enriched domain event to the queue for asynchronous processing.
   * @param eventName The name of the event (e.g. 'business.created', 'listing.published')
   * @param data The event payload data
   * @param context Optional event-specific context (e.g., location, categories) to prevent consumer queries
   * @param version The version of the event schema (defaults to 1)
   */
  async publish<TData, TContext = Record<string, unknown>>(
    eventName: string,
    data: TData,
    context?: TContext,
    version: number = 1,
  ): Promise<void> {
    const enrichedEvent = {
      metadata: {
        version,
        occurredAt: new Date().toISOString(),
      },
      data,
      ...(context !== undefined ? { context } : {}),
    } as EnrichedDomainEvent<TData, TContext>;

    try {
      await this.eventQueue.add(eventName, enrichedEvent, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.debug(`Published event ${eventName} v${version}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${eventName}`, error);
    }
  }
}
