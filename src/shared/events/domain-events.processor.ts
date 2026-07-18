import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('domain-events')
export class DomainEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(DomainEventsProcessor.name);

  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  async process(job: Job<Record<string, unknown>, unknown, string>): Promise<{ success: boolean }> {
    this.logger.debug(`Processing domain event: ${job.name} (Job ${job.id})`);

    // Fan-out locally to all feature module consumers (e.g., FeedConsumer)
    await this.eventEmitter.emitAsync(job.name, job.data);

    return { success: true };
  }
}
