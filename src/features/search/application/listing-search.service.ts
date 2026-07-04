import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SearchListingsDto, ListingSortOption } from '../dto/search.dto.js';
import { Prisma } from '../../../../generated/prisma/client.js';

@Injectable()
export class ListingSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchListingsDto) {
    let businessProfileIds: string[] | undefined = undefined;

    // Step 1: Geospatial pre-filter
    if (dto.lat !== undefined && dto.lng !== undefined) {
      const radius = dto.radius ?? 15000;
      const locations = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT bp.id
        FROM "business_profiles" bp
        JOIN "Location" loc ON bp."locationId" = loc.id
        WHERE ST_DWithin(
          loc.coordinates::geography,
          ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography,
          ${radius}
        )
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
        verificationStatus: { in: ['VERIFIED', 'PENDING'] },
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
        skip: dto.offset ?? 0,
        take: dto.limit ?? 20,
        include: {
          businessProfile: {
            select: {
              id: true,
              name: true,
              slug: true,
              locationId: true,
              verificationStatus: true,
            },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { items, total };
  }
}
