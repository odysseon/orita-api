import { Injectable } from '@nestjs/common';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';
import {
  Prisma,
  Listing as PrismaListing,
  StorageProvider,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../shared/redis/redis.service.js';
import { IListingRepository } from '../domain/ports/listing.repository.port.js';
import { Listing } from '../domain/types/listing.entity.js';
import { ListingStatus } from '../domain/types/listing-status.enum.js';
import {
  CreateListingInput,
  DiscoverListingsInput,
  PaginatedListingSummaries,
  TransitionListingStatusInput,
  UpdateListingInput,
  ListingSummary,
} from '../domain/types/listing.types.js';

type PrismaListingExtended = PrismaListing & {
  categoryId?: string | null;
  reviews?: {
    id: string;
    reviewerId: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
  }[];
  media?: {
    provider: StorageProvider;
    fileId: string;
    mimeType: string;
    version: string | null;
    format: string | null;
    role: string;
    order: number | null;
  }[];
};

function toDomain(raw: PrismaListingExtended, mediaUrlService?: MediaUrlService): Listing {
  const coverMedia = raw.media?.find(m => m.role === 'COVER');
  const galleryMedia = raw.media?.filter(m => m.role === 'GALLERY').sort((a, b) => (a.order || 0) - (b.order || 0));
  return {
    id: raw.id,
    businessProfileId: raw.businessProfileId,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    status: raw.status,
    categoryId: raw.categoryId ?? null,
    price: {
      minPrice: raw.minPrice !== null ? raw.minPrice.toNumber() : null,
      maxPrice: raw.maxPrice !== null ? raw.maxPrice.toNumber() : null,
      currencyCode: raw.currencyCode,
      isNegotiable: raw.isNegotiable,
    },
    attributes: raw.attributes ? (raw.attributes as Record<string, unknown>) : null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    ...(raw.reviews && {
      reviews: raw.reviews.map((r) => ({
        id: r.id,
        reviewerId: r.reviewerId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    }),
    ...(mediaUrlService && coverMedia && {
      coverUrl: mediaUrlService.getMediaUrl(
        coverMedia.provider,
        coverMedia.fileId,
        coverMedia.mimeType,
        coverMedia.version,
        coverMedia.format
      )
    }),
    ...(mediaUrlService && galleryMedia && galleryMedia.length > 0 && {
      galleryUrls: galleryMedia.map(m => mediaUrlService.getMediaUrl(
        m.provider,
        m.fileId,
        m.mimeType,
        m.version,
        m.format
      ))
    }),
  };
}

@Injectable()
export class PrismaListingRepository extends IListingRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly mediaUrlService: MediaUrlService,
  ) {
    super();
  }

  private getCacheKey(id: string): string {
    return `listing:id:${id}`;
  }

  private getSlugCacheKey(slug: string): string {
    return `listing:slug:${slug}`;
  }

  private updateCacheAsync(listing: Listing): void {
    Promise.resolve()
      .then(async () => {
        await this.redisService.set(this.getCacheKey(listing.id), listing);
        await this.redisService.set(this.getSlugCacheKey(listing.slug), listing);
      })
      .catch(() => {}); // fire and forget
  }

  private deleteCacheAsync(id: string, slug: string): void {
    Promise.resolve()
      .then(async () => {
        await this.redisService.del(this.getCacheKey(id));
        await this.redisService.del(this.getSlugCacheKey(slug));
      })
      .catch(() => {}); // fire and forget
  }

  async create(input: CreateListingInput, slug: string): Promise<Listing> {
    const raw = await this.prisma.listing.create({
      data: {
        businessProfileId: input.businessProfileId,
        title: input.title,
        categoryId: input.categoryId,
        slug,
        description: input.description ?? null,
        ...(input.price?.minPrice !== undefined && { minPrice: input.price.minPrice }),
        ...(input.price?.maxPrice !== undefined && { maxPrice: input.price.maxPrice }),
        ...(input.price?.currencyCode !== undefined && { currencyCode: input.price.currencyCode }),
        ...(input.price?.isNegotiable !== undefined && { isNegotiable: input.price.isNegotiable }),
        ...(input.attributes !== undefined && {
          attributes: input.attributes as Prisma.InputJsonValue,
        }),
      },
    });
    const domain = toDomain(raw);
    this.updateCacheAsync(domain);
    return domain;
  }

  async findById(id: string): Promise<Listing | null> {
    const cached = await this.redisService.get<Listing>(this.getCacheKey(id));
    if (cached) return cached;

    const raw = await this.prisma.listing.findUnique({
      where: { id },
      include: { reviews: true, media: true },
    });
    const domain = raw ? toDomain(raw, this.mediaUrlService) : null;
    if (domain) {
      this.updateCacheAsync(domain);
    }
    return domain;
  }

  async findBySlug(slug: string): Promise<Listing | null> {
    const cached = await this.redisService.get<Listing>(this.getSlugCacheKey(slug));
    if (cached) return cached;

    const raw = await this.prisma.listing.findFirst({
      where: { slug },
      include: { reviews: true, media: true },
    });
    const domain = raw ? toDomain(raw, this.mediaUrlService) : null;
    if (domain) {
      this.updateCacheAsync(domain);
    }
    return domain;
  }

  async isSlugTaken(businessProfileId: string, slug: string): Promise<boolean> {
    const count = await this.prisma.listing.count({
      where: { businessProfileId, slug },
    });
    return count > 0;
  }

  async findByBusinessProfile(businessProfileId: string): Promise<Listing[]> {
    const rows = await this.prisma.listing.findMany({
      where: { businessProfileId },
      include: { reviews: true, media: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => toDomain(r as PrismaListingExtended, this.mediaUrlService));
  }

  async update(id: string, input: UpdateListingInput): Promise<Listing> {
    const raw = await this.prisma.listing.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.price !== undefined && {
          minPrice: input.price.minPrice ?? null,
          maxPrice: input.price.maxPrice ?? null,
          currencyCode: input.price.currencyCode ?? null,
          isNegotiable: input.price.isNegotiable,
        }),
        ...(input.attributes !== undefined && {
          attributes:
            input.attributes === null ? Prisma.DbNull : (input.attributes as Prisma.InputJsonValue),
        }),
      },
      include: { media: true },
    });
    const domain = toDomain(raw, this.mediaUrlService);
    this.updateCacheAsync(domain);
    return domain;
  }

  async transitionStatus(id: string, input: TransitionListingStatusInput): Promise<Listing> {
    const raw = await this.prisma.listing.update({
      where: { id },
      data: { status: input.status },
      include: { media: true },
    });
    const domain = toDomain(raw, this.mediaUrlService);
    this.updateCacheAsync(domain);
    return domain;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return;

    await this.prisma.listing.delete({ where: { id } });
    this.deleteCacheAsync(existing.id, existing.slug);
  }

  async discover(input: DiscoverListingsInput): Promise<PaginatedListingSummaries> {
    const attributeFilters: Prisma.ListingWhereInput[] = input.attributes
      ? Object.entries(input.attributes).map(([key, value]) => ({
          attributes: {
            path: [key],
            equals: value !== null ? (value as Prisma.InputJsonValue) : Prisma.DbNull,
          },
        }))
      : [];

    const searchFilters: Prisma.ListingWhereInput[] = input.search
      ? [
          {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          },
        ]
      : [];

    const andConditions = [...attributeFilters, ...searchFilters];
    const skip = (input.page - 1) * input.limit;

    if (input.lat !== undefined && input.lng !== undefined) {
      const radiusMeters = (input.radiusInKm ?? 10) * 1000;

      const rawItems = await this.prisma.$queryRaw<
        {
          id: string;
          businessProfileId: string;
          businessProfileSlug: string;
          title: string;
          slug: string;
          description: string | null;
          minPrice: number | null;
          maxPrice: number | null;
          currencyCode: string | null;
          isNegotiable: boolean;
          categoryId: string | null;
          attributes: Prisma.JsonValue;
          coverMedia: {
            provider: string;
            fileId: string;
            mimeType: string;
            version: string | null;
            format: string | null;
          } | null;
          distance: number;
        }[]
      >`
        SELECT l.id, l."businessProfileId", bp.slug as "businessProfileSlug", l.title, l.slug, l.description, 
               l."minPrice", l."maxPrice", l."currencyCode", l."isNegotiable", l."categoryId", l.attributes,
               (SELECT json_build_object('provider', m.provider, 'fileId', m."fileId", 'mimeType', m."mimeType", 'version', m.version, 'format', m.format) FROM "media" m WHERE m."listingId" = l.id AND m.role = 'COVER' LIMIT 1) as "coverMedia",
               (ST_Distance(loc.coordinates::geography, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography) / 1000) AS distance
        FROM listings l
        JOIN business_profiles bp ON l."businessProfileId" = bp.id
        JOIN "locations" loc ON bp."locationId" = loc.id
        WHERE l.status = ${input.status ?? ListingStatus.PUBLISHED}::"ListingStatus"
          AND bp."isPublic" = true
          AND ST_DWithin(loc.coordinates::geography, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography, ${radiusMeters})
          ${input.businessProfileId ? Prisma.sql`AND l."businessProfileId" = ${input.businessProfileId}` : Prisma.empty}
          ${input.currencyCode ? Prisma.sql`AND l."currencyCode" = ${input.currencyCode}` : Prisma.empty}
          ${input.isNegotiable !== undefined ? Prisma.sql`AND l."isNegotiable" = ${input.isNegotiable}` : Prisma.empty}
          ${input.minPrice !== undefined ? Prisma.sql`AND l."minPrice" >= ${input.minPrice}` : Prisma.empty}
          ${input.maxPrice !== undefined ? Prisma.sql`AND l."maxPrice" <= ${input.maxPrice}` : Prisma.empty}
          ${input.search ? Prisma.sql`AND (l.title ILIKE ${'%' + input.search + '%'} OR l.description ILIKE ${'%' + input.search + '%'})` : Prisma.empty}
          ${
            input.categorySlug
              ? Prisma.sql`AND EXISTS (
             SELECT 1 FROM "categories" c 
             LEFT JOIN "categories" parent ON c."parentId" = parent.id
             WHERE c.id = l."categoryId" AND (c.slug = ${input.categorySlug} OR parent.slug = ${input.categorySlug})
           )`
              : Prisma.empty
          }
        ORDER BY distance ASC
        LIMIT ${input.limit}
        OFFSET ${skip};
      `;

      const countResult = await this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) as total 
        FROM listings l
        JOIN business_profiles bp ON l."businessProfileId" = bp.id
        JOIN "locations" loc ON bp."locationId" = loc.id
        WHERE l.status = ${input.status ?? ListingStatus.PUBLISHED}::"ListingStatus"
          AND bp."isPublic" = true
          AND ST_DWithin(loc.coordinates::geography, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography, ${radiusMeters})
          ${input.businessProfileId ? Prisma.sql`AND l."businessProfileId" = ${input.businessProfileId}` : Prisma.empty}
          ${input.currencyCode ? Prisma.sql`AND l."currencyCode" = ${input.currencyCode}` : Prisma.empty}
          ${input.isNegotiable !== undefined ? Prisma.sql`AND l."isNegotiable" = ${input.isNegotiable}` : Prisma.empty}
          ${input.minPrice !== undefined ? Prisma.sql`AND l."minPrice" >= ${input.minPrice}` : Prisma.empty}
          ${input.maxPrice !== undefined ? Prisma.sql`AND l."maxPrice" <= ${input.maxPrice}` : Prisma.empty}
          ${input.search ? Prisma.sql`AND (l.title ILIKE ${'%' + input.search + '%'} OR l.description ILIKE ${'%' + input.search + '%'})` : Prisma.empty}
          ${
            input.categorySlug
              ? Prisma.sql`AND EXISTS (
             SELECT 1 FROM "categories" c 
             LEFT JOIN "categories" parent ON c."parentId" = parent.id
             WHERE c.id = l."categoryId" AND (c.slug = ${input.categorySlug} OR parent.slug = ${input.categorySlug})
           )`
              : Prisma.empty
          };
      `;

      const items = rawItems.map((r) => ({
        id: r.id,
        businessProfileId: r.businessProfileId,
        businessProfileSlug: r.businessProfileSlug,
        title: r.title,
        slug: r.slug,
        description: r.description,
        minPrice: r.minPrice !== null ? Number(r.minPrice) : null,
        maxPrice: r.maxPrice !== null ? Number(r.maxPrice) : null,
        currencyCode: r.currencyCode,
        isNegotiable: r.isNegotiable,
        categoryId: r.categoryId,
        attributes: r.attributes as Record<string, unknown> | null,
        ...(r.coverMedia
          ? {
              coverUrl: this.mediaUrlService.getMediaUrl(
                r.coverMedia.provider as StorageProvider,
                r.coverMedia.fileId,
                r.coverMedia.mimeType,
                r.coverMedia.version,
                r.coverMedia.format,
              ),
            }
          : {}),
      }));

      return this.enrichWithSavedStatus(
        items,
        Number(countResult[0]?.total ?? 0),
        input.page,
        input.limit,
        input.currentUserId,
      );
    }

    const where: Prisma.ListingWhereInput = {
      status: input.status ?? ListingStatus.PUBLISHED,
      businessProfile: {
        isPublic: true,
      },
      ...(input.businessProfileId && { businessProfileId: input.businessProfileId }),
      ...(input.currencyCode && { currencyCode: input.currencyCode }),
      ...(input.isNegotiable !== undefined && { isNegotiable: input.isNegotiable }),
      ...(input.minPrice !== undefined && { minPrice: { gte: input.minPrice } }),
      ...(input.maxPrice !== undefined && { maxPrice: { lte: input.maxPrice } }),
      ...(input.categorySlug && {
        category: {
          OR: [{ slug: input.categorySlug }, { parent: { slug: input.categorySlug } }],
        },
      }),
      ...(andConditions.length > 0 && { AND: andConditions }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        skip,
        take: input.limit,
        include: {
          reviews: true,
          media: {
            where: { role: 'COVER' },
            take: 1,
            select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
          },
          businessProfile: {
            select: { slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.listing.count({ where }),
    ]);

    const items = rows.map((r) => {
      const coverMedia = r.media?.[0];
      const coverUrl = coverMedia
        ? this.mediaUrlService.getMediaUrl(
            coverMedia.provider,
            coverMedia.fileId,
            coverMedia.mimeType,
            coverMedia.version,
            coverMedia.format,
          )
        : undefined;
      return {
        id: r.id,
        businessProfileId: r.businessProfileId,
        businessProfileSlug: (r as unknown as { businessProfile: { slug: string } }).businessProfile
          .slug,
        title: r.title,
        slug: r.slug,
        description: r.description,
        minPrice: r.minPrice !== null ? r.minPrice.toNumber() : null,
        maxPrice: r.maxPrice !== null ? r.maxPrice.toNumber() : null,
        currencyCode: r.currencyCode ?? null,
        isNegotiable: r.isNegotiable,
        categoryId: (r as { categoryId?: string | null }).categoryId ?? null,
        attributes: r.attributes ? (r.attributes as Record<string, unknown>) : null,
        ...(coverUrl !== undefined ? { coverUrl } : {}),
      };
    });

    return this.enrichWithSavedStatus(items, total, input.page, input.limit, input.currentUserId);
  }

  private async enrichWithSavedStatus(
    items: ListingSummary[],
    total: number,
    page: number,
    limit: number,
    currentUserId?: string,
  ): Promise<PaginatedListingSummaries> {
    if (!currentUserId || items.length === 0) {
      return { items, total, page, limit };
    }

    const listingIds = items.map((i) => i.id);
    const saves = await this.prisma.savedListing.findMany({
      where: {
        userId: currentUserId,
        listingId: { in: listingIds },
      },
      select: { listingId: true },
    });

    const savedSet = new Set(saves.map((s) => s.listingId));

    return {
      items: items.map((i: ListingSummary) => ({
        ...i,
        isSaved: savedSet.has(i.id),
      })),
      total,
      page,
      limit,
    };
  }
}
