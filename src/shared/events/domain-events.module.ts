import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DomainEventsProcessor } from './domain-events.processor.js';
import { EventBusService } from './event-bus.service.js';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'domain-events',
    }),
  ],
  providers: [DomainEventsProcessor, EventBusService],
  exports: [BullModule, EventBusService],
})
export class DomainEventsModule {}
