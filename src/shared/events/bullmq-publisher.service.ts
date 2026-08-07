import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IEventPublisher } from './event-publisher.interface.js';
import { OutboxEvent } from '../../../generated/prisma/client.js';
import { EnrichedDomainEvent } from './event-bus.service.js';

@Injectable()
export class BullMQPublisher implements IEventPublisher {
  constructor(@InjectQueue('domain-events') private readonly eventQueue: Queue) {}

  async publish(event: OutboxEvent): Promise<void> {
    const enrichedEvent: EnrichedDomainEvent = {
      metadata: {
        version: event.eventVersion,
        occurredAt: event.occurredAt.toISOString(),
      },
      data: event.payload, // Payload is properly checked in event bus, we cast it back here
      ...(event.metadata ? { context: event.metadata as Record<string, unknown> } : {}),
    };

    // Dispatch to the existing BullMQ topic.
    // Notice how the BullMQ retry settings can be separate from the Outbox backoff.
    // For now, we delegate the delivery attempt tracking purely to BullMQ
    // because if BullMQ accepts the job, the outbox considers it published.
    await this.eventQueue.add(event.eventType, enrichedEvent, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
