import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DiscoveryItemType } from '../../../../generated/prisma/client.js';

export interface FeedQueryParams {
  userId: string;
  userLat: number;
  userLng: number;
  limit?: number;
  offset?: number;
}

export interface FeedItemView {
  id: string;
  itemType: DiscoveryItemType;
  referenceId: string;
  businessProfileId: string;
  score: number;
  distanceMeters: number;
  createdAt: Date;
}

@Injectable()
export class PrismaFeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(params: FeedQueryParams): Promise<FeedItemView[]> {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const maxDistance = 15000; // 15km

    // Raw SQL for ranking
    // 1. Distance (50%): ST_Distance
    // 2. Freshness (25%): 14-day decay
    // 3. Quality (15%): basic checks
    // 4. Popularity (10%): hardcoded to 0 for MVP if no analytics table join is ready

    const results = await this.prisma.$queryRaw<
      {
        id: string;
        itemType: DiscoveryItemType;
        referenceId: string;
        businessProfileId: string;
        distanceMeters: number;
        score: number;
        createdAt: Date;
      }[]
    >`
      WITH user_loc AS (
        SELECT ST_SetSRID(ST_MakePoint(${params.userLng}, ${params.userLat}), 4326)::geography AS pt
      ),
      feed_candidates AS (
        SELECT 
          d.id,
          d."itemType",
          d."referenceId",
          d."businessProfileId",
          d."createdAt",
          bp."verificationStatus",
          ST_Distance(loc.coordinates::geography, user_loc.pt) AS dist_meters
        FROM "discovery_items" d
        JOIN "business_profiles" bp ON d."businessProfileId" = bp.id
        JOIN "Location" loc ON bp."locationId" = loc.id
        CROSS JOIN user_loc
        WHERE ST_DWithin(loc.coordinates::geography, user_loc.pt, ${maxDistance})
      ),
      scored_candidates AS (
        SELECT 
          id,
          "itemType",
          "referenceId",
          "businessProfileId",
          "createdAt",
          dist_meters,
          -- Distance Score (50 points max). 0m = 50, 15000m = 0
          GREATEST(0, 50 * (1 - (dist_meters / 15000))) AS score_distance,
          
          -- Freshness Score (25 points max). 14-day exponential-ish decay
          -- Day 0 = 25, Day 7 = 10 (40%), Day 14 = 2.5 (10%)
          -- Using linear decay for MVP simplicity: GREATEST(0, 25 * (1 - (days_old / 14)))
          GREATEST(0, 25 * (1 - (EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 86400) / 14)) AS score_freshness,

          -- Quality Score (15 points max)
          (CASE WHEN "verificationStatus" = 'VERIFIED' THEN 15 ELSE 5 END) AS score_quality,
          
          -- Popularity Score (10 points max)
          -- Hardcoded to 5 for MVP until analytics are fully wired
          5 AS score_popularity

        FROM feed_candidates
      )
      SELECT 
        id,
        "itemType",
        "referenceId",
        "businessProfileId",
        "createdAt",
        dist_meters AS "distanceMeters",
        (score_distance + score_freshness + score_quality + score_popularity) AS score
      FROM scored_candidates
      ORDER BY score DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return results.map((r) => ({
      id: r.id,
      itemType: r.itemType,
      referenceId: r.referenceId,
      businessProfileId: r.businessProfileId,
      score: Number(r.score),
      distanceMeters: Number(r.distanceMeters),
      createdAt: r.createdAt,
    }));
  }
}
