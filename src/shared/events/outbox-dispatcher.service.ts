import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OutboxRepository } from './outbox.repository.js';
import { EnrichedDomainEvent } from './event-bus.service.js';

@Injectable()
export class OutboxDispatcherService {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private isProcessing = false;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    @InjectQueue('domain-events') private readonly eventQueue: Queue,
  ) {}

  /**
   * Polls the outbox for unpublished events every second.
   * Uses a lock (isProcessing) to prevent overlapping cron executions
   * within the same Node process.
   */
  @Cron(CronExpression.EVERY_SECOND)
  async dispatchEvents() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events = await this.outboxRepository.getUnpublishedEvents(100);

      if (events.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.logger.debug(`Found ${events.length} unpublished events in the outbox`);

      const successfulIds: string[] = [];

      for (const event of events) {
        try {
          const enrichedEvent: EnrichedDomainEvent = {
            metadata: {
              version: event.eventVersion,
              occurredAt: event.occurredAt.toISOString(),
            },
            data: event.payload,
            ...(event.metadata ? { context: event.metadata as Record<string, unknown> } : {}),
          };

          // Dispatch to the existing BullMQ topic
          await this.eventQueue.add(event.eventType, enrichedEvent, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
            removeOnFail: false,
          });

          successfulIds.push(event.id);
        } catch (error) {
          this.logger.error(`Failed to dispatch event ${event.id} to BullMQ`, error);

          // Exponential backoff for the outbox itself
          const nextAvailableAt = new Date();
          nextAvailableAt.setSeconds(
            nextAvailableAt.getSeconds() + Math.pow(2, event.retryCount + 1),
          );

          await this.outboxRepository.markAsFailed(event.id, nextAvailableAt);
        }
      }

      if (successfulIds.length > 0) {
        await this.outboxRepository.markAsPublished(successfulIds);
        this.logger.debug(`Successfully dispatched ${successfulIds.length} events`);
      }
    } catch (error) {
      this.logger.error('Error while dispatching outbox events', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
