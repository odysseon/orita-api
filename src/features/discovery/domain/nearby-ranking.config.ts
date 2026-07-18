export interface NearbyRankingWeights {
  distance: number;
  freshness: number;
  urgency: number;
}

export interface NearbyRankingConfig {
  version: string;
  weights: NearbyRankingWeights;
  urgencyWindowHours: number;
}

export const DEFAULT_NEARBY_RANKING_CONFIG: NearbyRankingConfig = {
  version: 'v1',
  weights: { distance: 0.45, freshness: 0.4, urgency: 0.15 },
  urgencyWindowHours: 2,
};

export const NEARBY_RANKING_CONFIG = Symbol('NEARBY_RANKING_CONFIG');
