import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';
import {
  NearbyItemDto,
  NearbyItemKind,
  NearbyParams,
} from '../domain/discovery-publisher.interface.js';
import type { NearbyRankingConfig } from '../domain/nearby-ranking.config.js';
import { NEARBY_RANKING_CONFIG } from '../domain/nearby-ranking.config.js';
import { OPPORTUNITY_TYPE_POLICIES } from '../domain/opportunity-type.policy.js';

@Injectable()
export class PrismaNearbyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
    @Inject(NEARBY_RANKING_CONFIG) private readonly config: NearbyRankingConfig,
  ) {}

  async findRanked(params: NearbyParams): Promise<NearbyItemDto[]> {
    const limit = params.limit ?? 20;
    const radiusMeters = (params.radiusKm ?? 2) * 1000;
    const hasCursor = params.cursorScore !== undefined && params.cursorId !== undefined;
    const cursorScore = hasCursor ? params.cursorScore : 0;
    const cursorId = hasCursor ? params.cursorId : '';

    const typesFilterSql =
      params.types && params.types.length > 0
        ? Prisma.sql`op.type::text IN (${Prisma.join(params.types)})`
        : Prisma.sql`1=1`;

    const results = await this.prisma.$queryRaw<
      {
        id: string;
        title: string;
        body: string | null;
        type: string;
        status: string;
        expires_at: Date | null;
        created_at: Date;
        author_id: string;
        business_profile_id: string | null;
        location_id: string;
        location_name: string;
        formatted_address: string | null;
        author_username: string;
        author_display_name: string | null;
        business_name: string | null;
        dist_meters: number;
        hours_old: number;
        hours_remaining: number | null;
        score: number;
      }[]
    >`
      WITH user_point AS (
        SELECT ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography AS pt
      ),
      candidates AS (
        SELECT
          op.id,
          op.title,
          op.body,
          op.type,
          op.status,
          op.expires_at,
          op.created_at,
          op.author_id,
          op.business_profile_id,
          op.location_id,
          l.name              AS location_name,
          l."formattedAddress" AS formatted_address,
          u.username          AS author_username,
          u."displayName"     AS author_display_name,
          bp.name             AS business_name,
          
          ST_Distance(
            loc.coordinates::geography,
            (SELECT pt FROM user_point)
          ) AS dist_meters,
          EXTRACT(EPOCH FROM (NOW() - op.created_at)) / 3600  AS hours_old,
          EXTRACT(EPOCH FROM (op.expires_at - NOW())) / 3600  AS hours_remaining
        FROM opportunity_posts op
        JOIN locations l ON l.id = op.location_id
        JOIN users u ON u.id = op.author_id
        JOIN locations loc ON loc.id = op.location_id
        LEFT JOIN business_profiles bp ON bp.id = op.business_profile_id
        WHERE
          op.status = 'ACTIVE'
          AND (op.expires_at IS NULL OR op.expires_at > NOW())
          AND ${typesFilterSql}
          AND ST_DWithin(
            loc.coordinates::geography,
            (SELECT pt FROM user_point),
            ${radiusMeters}
          )
      ),
      scored AS (
        SELECT
          *,
          EXP(-dist_meters / (${radiusMeters} / 3.0)) AS distance_score,
          
          EXP(-0.693 * hours_old / 
            CASE type
              WHEN 'TEMP_SERVICE' THEN ${OPPORTUNITY_TYPE_POLICIES['TEMP_SERVICE'].freshnessHalfLifeHours}
              WHEN 'FREE' THEN ${OPPORTUNITY_TYPE_POLICIES['FREE'].freshnessHalfLifeHours}
              WHEN 'WANTED' THEN ${OPPORTUNITY_TYPE_POLICIES['WANTED'].freshnessHalfLifeHours}
              WHEN 'FOR_SALE' THEN ${OPPORTUNITY_TYPE_POLICIES['FOR_SALE'].freshnessHalfLifeHours}
              WHEN 'BORROW_LEND' THEN ${OPPORTUNITY_TYPE_POLICIES['BORROW_LEND'].freshnessHalfLifeHours}
              WHEN 'LOST_FOUND' THEN ${OPPORTUNITY_TYPE_POLICIES['LOST_FOUND'].freshnessHalfLifeHours}
              ELSE 24
            END
          ) AS freshness_score,
          
          CASE
            WHEN hours_remaining <= ${this.config.urgencyWindowHours} AND hours_remaining IS NOT NULL
              THEN (${this.config.urgencyWindowHours} - LEAST(hours_remaining, ${this.config.urgencyWindowHours})) / ${this.config.urgencyWindowHours}
            ELSE 0
          END AS urgency_score
        FROM candidates
      ),
      ranked AS (
        SELECT
          *,
          (${this.config.weights.distance} * distance_score
         + ${this.config.weights.freshness} * freshness_score
         + ${this.config.weights.urgency} * urgency_score) AS score
        FROM scored
        WHERE (${hasCursor} = false OR score < ${cursorScore}
               OR (score = ${cursorScore} AND id < ${cursorId}))
        ORDER BY score DESC, id DESC
        LIMIT ${limit}
      )
      SELECT * FROM ranked
    `;

    if (results.length === 0) {
      return [];
    }

    const postIds = results.map((r) => r.id);

    const media = await this.prisma.opportunityMedia.findMany({
      where: { postId: { in: postIds } },
    });

    const authorIds = [...new Set(results.map((r) => r.author_id))];
    const businessIds = Array.from(
      new Set(results.map((r) => r.business_profile_id).filter((id): id is string => id !== null)),
    );

    const [userAvatars, businessLogos] = await Promise.all([
      this.prisma.media.findMany({
        where: { userId: { in: authorIds }, role: 'AVATAR' },
      }),
      this.prisma.media.findMany({
        where: { businessProfileId: { in: businessIds }, role: 'LOGO' },
      }),
    ]);

    return results.map((r) => {
      const postMedia = media
        .filter((m) => m.postId === r.id)
        .map((m) => ({
          url: this.mediaUrlService.getMediaUrl(
            m.provider,
            m.fileId,
            m.mimeType,
            m.version ?? undefined,
            m.format ?? undefined,
          ),
          mimeType: m.mimeType,
        }));

      const authorAvatar = userAvatars.find((a) => a.userId === r.author_id);
      const authorAvatarUrl = authorAvatar
        ? this.mediaUrlService.getMediaUrl(
            authorAvatar.provider,
            authorAvatar.fileId,
            authorAvatar.mimeType,
            authorAvatar.version ?? undefined,
            authorAvatar.format ?? undefined,
          )
        : undefined;

      let postedAs: { id: string; name: string; logoUrl?: string } | undefined = undefined;
      if (r.business_profile_id) {
        const logo = businessLogos.find((l) => l.businessProfileId === r.business_profile_id);
        const logoUrl = logo
          ? this.mediaUrlService.getMediaUrl(
              logo.provider,
              logo.fileId,
              logo.mimeType,
              logo.version ?? undefined,
              logo.format ?? undefined,
            )
          : undefined;

        postedAs = {
          id: r.business_profile_id,
          name: r.business_name ?? 'Unknown Business',
        };

        if (logoUrl) {
          postedAs.logoUrl = logoUrl;
        }
      }

      return {
        id: r.id,
        kind: NearbyItemKind.OPPORTUNITY_POST,
        title: r.title,
        body: r.body ?? undefined,
        subtype: r.type,
        status: r.status,
        location: {
          id: r.location_id,
          name: r.location_name,
          formattedAddress: r.formatted_address ?? undefined,
        },
        author: {
          id: r.author_id,
          username: r.author_username,
          displayName: r.author_display_name ?? undefined,
          avatarUrl: authorAvatarUrl,
        },
        postedAs,
        media: postMedia,
        expiresAt: r.expires_at ?? undefined,
        createdAt: r.created_at,
        _score: Number(r.score),
        _rankingVersion: this.config.version,
      };
    });
  }
}
