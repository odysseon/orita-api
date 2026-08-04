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
        description: string | null;
        price: number | null;
        category_id: string;
        type: string;
        status: string;
        expires_at: Date | null;
        created_at: Date;
        author_id: string;
        location_id: string;
        location_name: string;
        formatted_address: string | null;
        author_username: string;
        author_display_name: string | null;
        dist_meters: number;
        age_hours: number;
        decay_rate: number;
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
          op.description,
          op.price,
          op."categoryId" AS category_id,
          op.type,
          op.status,
          op."expiresAt" AS expires_at,
          op."createdAt" AS created_at,
          op."authorId" AS author_id,
          op."locationId" AS location_id,
          op."decayRate" AS decay_rate,
          l.name              AS location_name,
          l."formattedAddress" AS formatted_address,
          u.username          AS author_username,
          u."displayName"     AS author_display_name,
          
          ST_Distance(
            loc.coordinates::geography,
            (SELECT pt FROM user_point)
          ) AS dist_meters,
          EXTRACT(EPOCH FROM (NOW() - op."lastBoostedAt")) / 3600  AS age_hours,
          EXTRACT(EPOCH FROM (op."expiresAt" - NOW())) / 3600  AS hours_remaining
        FROM opportunity_posts op
        JOIN locations l ON l.id = op."locationId"
        JOIN users u ON u.id = op."authorId"
        JOIN locations loc ON loc.id = op."locationId"
        WHERE
          op.status = 'ACTIVE'
          AND (op."expiresAt" IS NULL OR op."expiresAt" > NOW())
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
          
          EXP(-decay_rate * age_hours) AS freshness_score,
          
          CASE
            WHEN hours_remaining <= ${this.config.urgencyWindowHours} AND hours_remaining IS NOT NULL
              THEN (${this.config.urgencyWindowHours} - LEAST(hours_remaining, ${this.config.urgencyWindowHours})) / ${this.config.urgencyWindowHours}
            ELSE 0
          END AS urgency_score
        FROM candidates
      ),

      computed_score AS (
        SELECT
          *,
          (${this.config.weights.distance} * distance_score
         + ${this.config.weights.freshness} * freshness_score
         + ${this.config.weights.urgency} * urgency_score) AS score
        FROM scored
      ),
      ranked AS (
        SELECT *
        FROM computed_score
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

    const media = await this.prisma.media.findMany({
      where: { opportunityPostId: { in: postIds } },
    });

    const authorIds = [...new Set(results.map((r) => r.author_id))];

    const [userAvatars] = await Promise.all([
      this.prisma.media.findMany({
        where: { userId: { in: authorIds }, role: 'AVATAR' },
      }),
    ]);

    return results.map((r) => {
      const postMedia = media
        .filter((m) => m.opportunityPostId === r.id)
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

      return {
        id: r.id,
        kind: NearbyItemKind.OPPORTUNITY_POST,
        title: r.title,
        description: r.description ?? undefined,
        price: r.price ? Number(r.price) : undefined,
        categoryId: r.category_id,
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
        media: postMedia,
        expiresAt: r.expires_at ?? undefined,
        createdAt: r.created_at,
        capabilities: {
          canReply: params.viewerId ? params.viewerId !== r.author_id : false,
          canEdit: false,
          canComplete: false,
          canDelete: false,
        },
        _score: Number(r.score),
        _rankingVersion: this.config.version,
      };
    });
  }
}
