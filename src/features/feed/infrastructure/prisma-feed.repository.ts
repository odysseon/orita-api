import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DiscoveryItemType } from '../../../../generated/prisma/client.js';
import { FeedWeights } from '../feed.weights.js';

export interface FeedQueryParams {
  userId?: string;
  userLat: number;
  userLng: number;
  limit?: number;
  cursorScore?: number;
  cursorId?: string;
}

export interface FeedItemView {
  id: string;
  itemType: DiscoveryItemType;
  referenceId: string;
  businessProfileId: string;
  score: number;
  distanceMeters: number;
  createdAt: Date;
  business?: any;
  listing?: any;
  tour?: any;
}

@Injectable()
export class PrismaFeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(params: FeedQueryParams): Promise<FeedItemView[]> {
    const limit = params.limit ?? 20;
    const maxDistance = 15000; // 15km

    const hasCursor = params.cursorScore !== undefined && params.cursorId !== undefined;
    const cursorScore = hasCursor ? params.cursorScore : 0;
    const cursorId = hasCursor ? params.cursorId : '';

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
          d."clicksCount",
          d."savesCount",
          d."messagesCount",
          d."sharesCount",
          d."hidesCount",
          d."reportsCount",
          bp."verificationStatus",
          ST_Distance(loc.coordinates::geography, user_loc.pt) AS dist_meters,
          CASE WHEN fb."businessId" IS NOT NULL THEN 1 ELSE 0 END AS is_followed_business,
          CASE WHEN fl."locationId" IS NOT NULL THEN 1 ELSE 0 END AS is_followed_location
        FROM "discovery_items" d
        JOIN "business_profiles" bp ON d."businessProfileId" = bp.id
        JOIN "locations" loc ON bp."locationId" = loc.id
        CROSS JOIN user_loc
        LEFT JOIN "follows" fb ON fb."businessId" = bp.id AND fb."followerId" = ${params.userId ?? ''}
        LEFT JOIN "follows" fl ON fl."locationId" = loc.id AND fl."followerId" = ${params.userId ?? ''}
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
          GREATEST(0, ${FeedWeights.distance} * (1 - (dist_meters / 15000))) AS score_distance,
          GREATEST(0, ${FeedWeights.freshness} * (1 - (EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 86400) / 14)) AS score_freshness,
          (is_followed_business * ${FeedWeights.followedBusiness}) AS score_followed_business,
          (is_followed_location * ${FeedWeights.followedLocation}) AS score_followed_location,
          (
            ("clicksCount" * 1) 
            + ("savesCount" * 10) 
            + ("messagesCount" * 15) 
            + ("sharesCount" * 5)
            - ("hidesCount" * 15)
            - ("reportsCount" * 50)
          ) AS score_popularity
        FROM feed_candidates
      ),
      ranked AS (
        SELECT 
          id,
          "itemType",
          "referenceId",
          "businessProfileId",
          "createdAt",
          dist_meters AS "distanceMeters",
          (score_distance + score_freshness + score_followed_business + score_followed_location + score_popularity) AS score
        FROM scored_candidates
      )
      SELECT * FROM ranked
      WHERE 
        (${hasCursor} = false) 
        OR (score < ${cursorScore}) 
        OR (score = ${cursorScore} AND id < ${cursorId})
      ORDER BY score DESC, id DESC
      LIMIT ${limit};
    `;

    if (results.length === 0) {
      return [];
    }

    // Hydration
    const businessIds = [...new Set(results.map((r) => r.businessProfileId))];
    const listingIds = results.filter((r) => r.itemType === 'LISTING').map((r) => r.referenceId);
    const tourIds = results.filter((r) => r.itemType === 'TOUR').map((r) => r.referenceId);

    const [businesses, listings, tours] = await Promise.all([
      this.prisma.businessProfile.findMany({
        where: { id: { in: businessIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          media: true,
          categories: true,
        },
      }),
      listingIds.length > 0
        ? this.prisma.listing.findMany({
            where: { id: { in: listingIds } },
            include: { media: true },
          })
        : [],
      tourIds.length > 0
        ? this.prisma.businessTour.findMany({
            where: { id: { in: tourIds } },
            include: { media: true },
          })
        : [],
    ]);

    const businessMap = new Map(
      businesses.map((b) => {
        const logo = b.media?.find((m) => m.role === 'LOGO')?.url;
        const cover = b.media?.find((m) => m.role === 'COVER')?.url;
        return [b.id, { ...b, logoUrl: logo, coverUrl: cover }];
      }),
    );
    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const tourMap = new Map(tours.map((t) => [t.id, t]));

    return results.map((r) => {
      const listing = r.itemType === 'LISTING' ? listingMap.get(r.referenceId) : undefined;
      const tour = r.itemType === 'TOUR' ? tourMap.get(r.referenceId) : undefined;
      const business = businessMap.get(r.businessProfileId);

      let refSlug = r.referenceId;
      if (r.itemType === 'LISTING' && listing) refSlug = listing.slug;
      if (r.itemType === 'BUSINESS' && business) refSlug = business.slug;

      return {
        id: r.id,
        itemType: r.itemType,
        referenceId: refSlug,
        businessProfileId: business?.slug || r.businessProfileId,
        score: Number(r.score),
        distanceMeters: Number(r.distanceMeters),
        createdAt: r.createdAt,
        business: business,
        listing: listing,
        tour: tour,
      };
    });
  }
}
