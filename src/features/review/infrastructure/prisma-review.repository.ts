import { Injectable } from '@nestjs/common';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../shared/redis/redis.service.js';
import { IReviewRepository } from '../domain/ports/review.repository.port.js';
import { Review } from '../domain/types/review.entity.js';
import {
  CreateReviewInput,
  UpdateReviewInput,
  GetListingReviewsInput,
  ReviewPage,
  ReviewWithMedia,
  ReviewMediaItem,
} from '../domain/types/review.types.js';
import type {
  Review as PrismaReview,
  Media as PrismaMedia,
} from '../../../../generated/prisma/client.js';
import { MediaRole } from '../../media/domain/types/media-role.enum.js';

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

@Injectable()
export class PrismaReviewRepository extends IReviewRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly mediaUrlService: MediaUrlService,
  ) {
    super();
  }

  private toDomain(raw: PrismaReview): Review {
    return {
      id: raw.id,
      listingId: raw.listingId,
      reviewerId: raw.reviewerId,
      rating: raw.rating,
      comment: raw.comment,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mediaItemFromRaw(raw: PrismaMedia): ReviewMediaItem {
    return {
      id: raw.id,
      url: this.mediaUrlService.getMediaUrl(
        raw.provider,
        raw.fileId,
        raw.mimeType,
        raw.version,
        raw.format,
      ),
      mediaType: raw.mediaType,
      order: raw.order,
      createdAt: raw.createdAt,
    };
  }

  private toWithMedia(raw: PrismaReview & { media: PrismaMedia[] }): ReviewWithMedia {
    const sorted = [...raw.media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return {
      ...this.toDomain(raw),
      media: sorted.map((m) => this.mediaItemFromRaw(m)),
    };
  }

  private async invalidateListingCache(listingId: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { slug: true },
    });
    if (listing) {
      await this.redisService.del(`listing:id:${listingId}`).catch(() => {});
      await this.redisService.del(`listing:slug:${listing.slug}`).catch(() => {});
    }
  }

  async create(input: CreateReviewInput): Promise<Review> {
    const raw = await this.prisma.review.create({
      data: {
        listingId: input.listingId,
        reviewerId: input.reviewerId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
    });
    await this.invalidateListingCache(input.listingId);
    return this.toDomain(raw);
  }

  async findById(id: string): Promise<Review | null> {
    const raw = await this.prisma.review.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByIdWithMedia(id: string): Promise<ReviewWithMedia | null> {
    const raw = await this.prisma.review.findUnique({
      where: { id },
      include: {
        media: {
          where: {
            role: MediaRole.GALLERY,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    return raw ? this.toWithMedia(raw) : null;
  }

  async existsByListingAndReviewer(listingId: string, reviewerId: string): Promise<boolean> {
    const count = await this.prisma.review.count({
      where: { listingId, reviewerId },
    });
    return count > 0;
  }

  async findByListing(input: GetListingReviewsInput): Promise<ReviewPage> {
    const limit = input.limit ?? 20;

    const rows = await this.prisma.review.findMany({
      where: {
        listingId: input.listingId,
      },
      include: {
        media: {
          where: {
            role: MediaRole.GALLERY,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1, // fetch one extra to detect next page
      ...(input.cursor
        ? {
            cursor: { id: input.cursor },
            skip: 1,
          }
        : {}),
    });

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;

    const lastItem = items[items.length - 1];

    return {
      items: items.map((i) => this.toWithMedia(i)),
      nextCursor: hasNextPage && lastItem ? lastItem.id : null,
    };
  }

  async update(id: string, input: UpdateReviewInput): Promise<Review> {
    const raw = await this.prisma.review.update({
      where: { id },
      data: {
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.comment !== undefined && { comment: input.comment }),
      },
    });
    await this.invalidateListingCache(raw.listingId);
    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { listingId: true },
    });
    if (review) {
      await this.prisma.review.delete({ where: { id } });
      await this.invalidateListingCache(review.listingId);
    }
  }
}
