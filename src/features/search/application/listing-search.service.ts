import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SearchListingsDto, ListingSortOption } from '../dto/search.dto.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';

@Injectable()
export class ListingSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  async search(dto: SearchListingsDto) {
    let businessProfileIds: string[] | undefined = undefined;

    // Step 1: Geospatial pre-filter
    if (dto.lat !== undefined && dto.lng !== undefined) {
      const locations = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT bp.id
        FROM "business_profiles" bp
        JOIN "business_locations" bl ON bl."businessProfileId" = bp.id AND bl."isPrimary" = true
        JOIN "locations" loc ON loc.id = bl."locationId"
      `;
      businessProfileIds = locations.map((l) => l.id);

      // If we filtered by location but found zero businesses, return early
      if (businessProfileIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    // Step 2: Build Prisma Query
    const where: Prisma.ListingWhereInput = {
      status: 'PUBLISHED',
      businessProfile: {
        isPublic: true,
      },
    };

    if (businessProfileIds) {
      where.businessProfileId = { in: businessProfileIds };
    }

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ];
    }

    if (dto.categoryId) {
      where.categoryId = dto.categoryId;
    }

    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      where.minPrice = {};
      where.maxPrice = {};
      if (dto.minPrice !== undefined) {
        where.minPrice.gte = dto.minPrice;
      }
      if (dto.maxPrice !== undefined) {
        where.maxPrice.lte = dto.maxPrice;
      }
    }

    // Parse filters: ?filter=Condition:New&filter=Brand:Apple
    if (dto.filter && dto.filter.length > 0) {
      const jsonFilters: Prisma.ListingWhereInput[] = [];
      for (const f of dto.filter) {
        const parts = f.split(':');
        if (parts.length >= 2) {
          const key = parts[0]!;
          const value = parts.slice(1).join(':'); // Re-join in case value contains ':'
          jsonFilters.push({
            attributes: { path: [key], equals: value },
          });
        }
      }
      if (jsonFilters.length > 0) {
        where.AND = jsonFilters;
      }
    }

    // Sorting
    let orderBy: Prisma.ListingOrderByWithRelationInput | Prisma.ListingOrderByWithRelationInput[];
    switch (dto.sort) {
      case ListingSortOption.NEWEST:
        orderBy = { createdAt: 'desc' };
        break;
      case ListingSortOption.PRICE_LOW:
        orderBy = { minPrice: 'asc' };
        break;
      case ListingSortOption.PRICE_HIGH:
        orderBy = { maxPrice: 'desc' };
        break;
      case ListingSortOption.DISTANCE:
      case ListingSortOption.RELEVANCE:
      default:
        // TODO: Distance and Relevance sorting require raw SQL or hybrid sorting logic.
        // For MVP, we fallback to newest.
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy,
        skip: Math.max(0, dto.offset ?? 0),
        take: Math.min(Math.max(1, dto.limit ?? 20), 100),
        include: {
          businessProfile: {
            select: {
              id: true,
              name: true,
              slug: true,
              verification: {
                select: {
                  status: true,
                },
              },
            },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          media: {
            where: { role: 'COVER' },
            select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
          },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    const mappedItems = items.map((item) => {
      const { media, ...rest } = item;
      return {
        ...rest,
        coverUrl: media?.[0]
          ? this.mediaUrlService.getMediaUrl(
              media[0].provider,
              media[0].fileId,
              media[0].mimeType,
              media[0].version ?? undefined,
              media[0].format ?? undefined,
            )
          : null,
      };
    });

    return { items: mappedItems, total };
  }
}
