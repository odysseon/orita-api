import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { OutboxRepository } from './outbox.repository.js';
import { EVENT_PUBLISHER } from './event-publisher.interface.js';
import type { IEventPublisher } from './event-publisher.interface.js';

@Injectable()
export class OutboxDispatcherService {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private isProcessing = false;
  private readonly dispatcherId: string;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
  ) {
    this.dispatcherId = `dispatcher-${uuidv4()}`;
  }

  /**
   * Polls the outbox for unpublished events every second.
   * Uses an atomic claim to lock events for processing.
   */
  @Cron(CronExpression.EVERY_SECOND)
  async dispatchEvents() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Lease events for 60 seconds
      const events = await this.outboxRepository.leaseNextBatch(100, 60000, this.dispatcherId);

      if (events.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.logger.debug(`Found and leased ${events.length} unpublished events in the outbox`);

      for (const event of events) {
        try {
          // Delegate publishing entirely to the IEventPublisher interface.
          await this.eventPublisher.publish(event);

          // Clear the lease and mark as published
          await this.outboxRepository.markAsPublished(event.id, this.dispatcherId);
        } catch (error) {
          this.logger.error(`Failed to publish event ${event.id}`, error);

          // Capped exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 60s, 2m, 5m, 10m, 15m, 30m
          const backoffSeconds = [1, 2, 4, 8, 16, 30, 60, 120, 300, 600, 900, 1800];
          const attemptIndex = Math.min(event.retryCount, backoffSeconds.length - 1);

          const isDeadLetter = event.retryCount >= backoffSeconds.length;

          const nextAvailableAt = new Date();
          nextAvailableAt.setSeconds(nextAvailableAt.getSeconds() + backoffSeconds[attemptIndex]!);

          await this.outboxRepository.releaseLeaseWithRetry(
            event.id,
            nextAvailableAt,
            this.dispatcherId,
            isDeadLetter,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error while dispatching outbox events', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
