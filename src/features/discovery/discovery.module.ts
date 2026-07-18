import { Module } from '@nestjs/common';
import { OpportunityController } from './api/controllers/opportunity.controller.js';
import { NearbyController } from './api/controllers/nearby.controller.js';
import { DiscoveryService } from './application/services/discovery.service.js';
import { OpportunityService } from './application/services/opportunity.service.js';
import { OpportunityPublisher } from './application/publishers/opportunity.publisher.js';
import { PrismaNearbyRepository } from './infrastructure/prisma-nearby.repository.js';
import { MediaModule } from '../media/media.module.js';
import {
  DEFAULT_NEARBY_RANKING_CONFIG,
  NEARBY_RANKING_CONFIG,
} from './domain/nearby-ranking.config.js';

@Module({
  imports: [MediaModule],
  controllers: [OpportunityController, NearbyController],
  providers: [
    DiscoveryService,
    OpportunityService,
    OpportunityPublisher,
    PrismaNearbyRepository,
    {
      provide: NEARBY_RANKING_CONFIG,
      useValue: DEFAULT_NEARBY_RANKING_CONFIG,
    },
  ],
})
export class DiscoveryModule {}
