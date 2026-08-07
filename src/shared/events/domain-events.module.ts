import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DomainEventsProcessor } from './domain-events.processor.js';
import { EventBusService } from './event-bus.service.js';
import { OutboxRepository } from './outbox.repository.js';
import { OutboxDispatcherService } from './outbox-dispatcher.service.js';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'domain-events',
    }),
  ],
  providers: [DomainEventsProcessor, EventBusService, OutboxRepository, OutboxDispatcherService],
  exports: [BullModule, EventBusService, OutboxRepository],
})
export class DomainEventsModule {}
