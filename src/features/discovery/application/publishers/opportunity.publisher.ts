import { Injectable } from '@nestjs/common';
import {
  DiscoveryPublisher,
  NearbyItemDto,
  NearbyParams,
} from '../../domain/discovery-publisher.interface.js';
import { PrismaNearbyRepository } from '../../infrastructure/prisma-nearby.repository.js';

@Injectable()
export class OpportunityPublisher implements DiscoveryPublisher {
  constructor(private readonly nearbyRepo: PrismaNearbyRepository) {}

  async findNearby(params: NearbyParams): Promise<NearbyItemDto[]> {
    return this.nearbyRepo.findRanked(params);
  }
}
