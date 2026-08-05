import { Injectable } from '@nestjs/common';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DiscoveryItemType, Media } from '../../../../generated/prisma/client.js';
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
  business?: unknown;
  listing?: unknown;
  tour?: unknown;
}

@Injectable()
export class PrismaFeedRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  async getFeed(params: FeedQueryParams): Promise<FeedItemView[]> {
    const limit = params.limit ?? 20;

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
        is_followed_business: number;
      }[]
    >`
            WITH RECURSIVE user_loc AS (
        SELECT ST_SetSRID(ST_MakePoint(${params.userLng}, ${params.userLat}), 4326)::geography AS pt
      ),
      user_interests_tree AS (
        SELECT "categoryId" as id
        FROM "user_interested_categories"
        WHERE "userId" = ${params.userId ?? ''}
        UNION
        SELECT c.id
        FROM "categories" c
        INNER JOIN user_interests_tree uit ON c."parentId" = uit.id
      ),
      feed_candidates AS (
        SELECT 
          d.id,
          d."itemType",
          d."referenceId",
          d."businessProfileId",
          d."createdAt",
          d."updatedAt",
          d."clicksCount",
          d."savesCount",
          d."messagesCount",
          d."sharesCount",
          d."hidesCount",
          d."reportsCount",
          bv."status" as "verificationStatus",
          ST_Distance(loc.coordinates::geography, user_loc.pt) AS dist_meters,
          CASE WHEN fb."businessId" IS NOT NULL THEN 1 ELSE 0 END AS is_followed_business,
          CASE WHEN fl."locationId" IS NOT NULL THEN 1 ELSE 0 END AS is_followed_location,
          CASE 
            WHEN d."itemType" = 'LISTING' THEN 
              (SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM "listings" l 
               JOIN user_interests_tree u ON u.id = l."categoryId"
               WHERE l.id = d."referenceId")
            WHEN d."itemType" = 'BUSINESS' THEN
              (SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM "business_categories" bc
               JOIN user_interests_tree u ON u.id = bc."categoryId"
               WHERE bc."businessId" = bp.id)
            ELSE 0
          END AS is_interested,
          CASE 
            WHEN d."itemType" = 'LISTING' THEN
              COALESCE((SELECT cdp."feedRadiusKm" FROM "listings" l JOIN "category_discovery_policies" cdp ON cdp."categoryId" = l."categoryId" WHERE l.id = d."referenceId"), 15)
            WHEN d."itemType" = 'BUSINESS' THEN
              COALESCE((SELECT MAX(cdp."feedRadiusKm") FROM "business_categories" bc JOIN "category_discovery_policies" cdp ON cdp."categoryId" = bc."categoryId" WHERE bc."businessId" = bp.id), 15)
            ELSE 15
          END AS item_radius_km
        FROM "discovery_items" d
        JOIN "business_profiles" bp ON d."businessProfileId" = bp.id
        LEFT JOIN "business_verifications" bv ON bv."businessId" = bp.id
        JOIN "business_locations" bl ON bl."businessProfileId" = bp.id AND bl."isPrimary" = true
        JOIN "locations" loc ON loc.id = bl."locationId"
        CROSS JOIN user_loc
        LEFT JOIN "business_follows" fb ON fb."businessId" = bp.id AND fb."userId" = ${params.userId ?? ''}
        LEFT JOIN "location_follows" fl ON fl."locationId" = loc.id AND fl."userId" = ${params.userId ?? ''}
        WHERE ST_DWithin(loc.coordinates::geography, user_loc.pt, 50000)
          AND bp."isPublic" = true
      ),
      scored_candidates AS (
        SELECT 
          id,
          "itemType",
          "referenceId",
          "businessProfileId",
          "createdAt",
          is_followed_business,
          dist_meters,
          
          -- Proximity Score
          (50.0 * EXP(-dist_meters / ((item_radius_km * 1000.0) / 5.0)::numeric)) AS score_proximity,
          
          -- Trust
          CASE 
            WHEN "verificationStatus"::text = 'VERIFIED' THEN ${FeedWeights.verification.VERIFIED}::numeric
            WHEN "verificationStatus"::text = 'PENDING' THEN ${FeedWeights.verification.PENDING}::numeric
            WHEN "verificationStatus"::text = 'REJECTED' THEN ${FeedWeights.verification.REJECTED}::numeric
            ELSE ${FeedWeights.verification.UNVERIFIED}::numeric
          END AS score_trust_multiplier,
          
          -- Popularity Score
          (
            ${FeedWeights.engagement.clicks}::numeric * LN(1 + "clicksCount") +
            ${FeedWeights.engagement.saves}::numeric * LN(1 + "savesCount") +
            ${FeedWeights.engagement.messages}::numeric * LN(1 + "messagesCount") +
            ${FeedWeights.engagement.shares}::numeric * LN(1 + "sharesCount") +
            ${FeedWeights.engagement.hides}::numeric * LN(1 + "hidesCount") +
            ${FeedWeights.engagement.reports}::numeric * LN(1 + "reportsCount")
          ) AS score_popularity_raw,
          
          -- Gravity Penalty
          POWER(GREATEST(0, EXTRACT(EPOCH FROM (NOW() - "updatedAt")) / 3600) + 2, ${FeedWeights.gravity}::numeric) AS gravity_penalty,
          
          -- Personalization Score
          (
            ((is_followed_business + is_followed_location) * ${FeedWeights.followBonus}::numeric) +
            (is_interested * ${FeedWeights.interestBonus}::numeric)
          ) AS score_personalization,
          
          -- Exploration Score
          CASE WHEN (EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 86400) < ${FeedWeights.exploration.newDaysThreshold}::numeric 
            THEN ${FeedWeights.exploration.newBonus}::numeric 
            ELSE 0 
          END + CASE WHEN ${hasCursor} = false THEN (random() * ${FeedWeights.exploration.randomJitter}::numeric) ELSE 0 END AS score_exploration

        FROM feed_candidates
      ),
      ranked AS (
        SELECT 
          id,
          "itemType",
          "referenceId",
          "businessProfileId",
          "createdAt",
          is_followed_business,
          dist_meters AS "distanceMeters",
          
          -- Final Score Composition
          (
            (score_proximity * score_trust_multiplier) 
            + (score_popularity_raw / gravity_penalty) 
            + score_personalization 
            + score_exploration
          ) AS score
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

    const [businesses, listings, tours, saves] = await Promise.all([
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
      params.userId && listingIds.length > 0
        ? this.prisma.favorite.findMany({
            where: {
              userId: params.userId,
              listingId: { in: listingIds },
            },
            select: { listingId: true },
          })
        : Promise.resolve([]),
    ]);

    const favoriteIds = new Set((saves as { listingId: string }[]).map((s) => s.listingId));

    const businessMap = new Map(
      businesses.map((b) => {
        const logo = b.media?.find((m) => m.role === 'LOGO');
        const cover = b.media?.find((m) => m.role === 'BANNER');
        const logoUrl = logo
          ? this.mediaUrlService.getMediaUrl(
              logo.provider,
              logo.fileId,
              logo.mimeType,
              logo.version ?? undefined,
              logo.format ?? undefined,
            )
          : undefined;
        const coverUrl = cover
          ? this.mediaUrlService.getMediaUrl(
              cover.provider,
              cover.fileId,
              cover.mimeType,
              cover.version ?? undefined,
              cover.format ?? undefined,
            )
          : undefined;
        return [b.id, { ...b, logoUrl, coverUrl }];
      }),
    );
    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const tourMap = new Map(tours.map((t) => [t.id, t]));

    return results.map((r) => {
      const listingRaw = r.itemType === 'LISTING' ? listingMap.get(r.referenceId) : undefined;
      const tourRaw = r.itemType === 'TOUR' ? tourMap.get(r.referenceId) : undefined;
      const business = businessMap.get(r.businessProfileId);

      let mappedListing: Record<string, unknown> | undefined = undefined;
      if (listingRaw) {
        mappedListing = {
          ...listingRaw,
          isSaved: favoriteIds.has(listingRaw.id),
        };
        if (listingRaw.media) {
          mappedListing['media'] = listingRaw.media.map((m: Media) => ({
            ...m,
            url: this.mediaUrlService.getMediaUrl(
              m.provider,
              m.fileId,
              m.mimeType,
              m.version ?? undefined,
              m.format ?? undefined,
            ),
          }));
        }
      }

      let mappedTour: Record<string, unknown> | undefined = undefined;
      if (tourRaw) {
        mappedTour = { ...tourRaw };
        if (tourRaw.media) {
          mappedTour['media'] = tourRaw.media.map((m: Media) => ({
            ...m,
            url: this.mediaUrlService.getMediaUrl(
              m.provider,
              m.fileId,
              m.mimeType,
              m.version ?? undefined,
              m.format ?? undefined,
            ),
          }));
        }
      }

      let refSlug = r.referenceId;
      if (r.itemType === 'LISTING' && mappedListing) refSlug = mappedListing['slug'] as string;
      if (r.itemType === 'BUSINESS' && business) refSlug = business.slug;

      return {
        id: r.id,
        itemType: r.itemType,
        referenceId: refSlug,
        businessProfileId: business?.slug || r.businessProfileId,
        score: Number(r.score),
        distanceMeters: Number(r.distanceMeters),
        createdAt: r.createdAt,
        business: business
          ? { ...business, isFollowed: Number(r.is_followed_business) === 1 }
          : undefined,
        listing: mappedListing,
        tour: mappedTour,
      };
    });
  }
}
