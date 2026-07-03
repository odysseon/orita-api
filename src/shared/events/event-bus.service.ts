import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface DomainEventPayload {
  [key: string]: any;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(@InjectQueue('domain-events') private readonly eventQueue: Queue) {}

  /**
   * Publishes a domain event to the queue for asynchronous processing.
   * @param eventName The name of the event (e.g. 'business.created', 'listing.published')
   * @param payload The event payload
   */
  async publish(eventName: string, payload: DomainEventPayload): Promise<void> {
    try {
      await this.eventQueue.add(eventName, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.debug(`Published event ${eventName}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${eventName}`, error);
    }
  }
}
