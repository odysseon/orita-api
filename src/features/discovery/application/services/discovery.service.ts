import { Injectable, Inject } from '@nestjs/common';
import { NearbyParams } from '../../domain/discovery-publisher.interface.js';
import { OpportunityPublisher } from '../publishers/opportunity.publisher.js';
import type { NearbyRankingConfig } from '../../domain/nearby-ranking.config.js';
import { NEARBY_RANKING_CONFIG } from '../../domain/nearby-ranking.config.js';
import { NearbyResultPageDto } from '../../api/dto/nearby-response.dto.js';

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly opportunityPublisher: OpportunityPublisher,
    @Inject(NEARBY_RANKING_CONFIG) private readonly config: NearbyRankingConfig,
  ) {}

  async getNearby(params: NearbyParams): Promise<NearbyResultPageDto> {
    // In the future:
    // const [opp, events, flashes] = await Promise.all([
    //   this.opportunityPublisher.findNearby(params),
    //   this.eventPublisher.findNearby(params),
    //   this.flashPublisher.findNearby(params)
    // ]);
    // const items = [...opp, ...events, ...flashes].sort((a, b) => (b._score || 0) - (a._score || 0)).slice(0, params.limit);

    const items = await this.opportunityPublisher.findNearby(params);

    let hasMore = false;
    let cursorScore = undefined;
    let cursorId = undefined;

    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        cursorScore = lastItem._score;
        cursorId = lastItem.id;
      }

      if (items.length === (params.limit ?? 20)) {
        hasMore = true;
      }
    }

    const cleanItems = items.map((item) => {
      const clean = { ...item };
      delete clean._score;
      delete clean._rankingVersion;
      return clean;
    });

    return {
      items: cleanItems,
      rankingVersion: this.config.version,
      cursorScore,
      cursorId,
      hasMore,
    };
  }
}
