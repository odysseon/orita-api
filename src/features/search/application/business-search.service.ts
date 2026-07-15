import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SearchBusinessesDto, BusinessSortOption } from '../dto/search.dto.js';
import { Prisma } from '../../../../generated/prisma/client.js';

@Injectable()
export class BusinessSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchBusinessesDto) {
    let businessProfileIds: string[] | undefined = undefined;

    // Step 1: Geospatial pre-filter
    if (dto.lat !== undefined && dto.lng !== undefined) {
      const radius = Math.min(Math.max(100, dto.radius ?? 15000), 50000);
      const locations = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT bp.id
        FROM "business_profiles" bp
        JOIN "locations" loc ON bp."locationId" = loc.id
        WHERE ST_DWithin(
          loc.coordinates::geography,
          ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography,
          ${radius}
        )
      `;
      businessProfileIds = locations.map((l) => l.id);

      if (businessProfileIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    // Step 2: Build Prisma Query
    const where: Prisma.BusinessProfileWhereInput = {
      isPublic: true,
    };

    if (businessProfileIds) {
      where.id = { in: businessProfileIds };
    }

    if (dto.q) {
      where.OR = [
        { name: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: dto.q, mode: 'insensitive' } } } } },
      ];
    }

    if (dto.categoryId) {
      where.categories = { some: { categoryId: dto.categoryId } };
    }

    // Parse filters: ?filter=VerificationStatus:VERIFIED
    // Or anything else that applies to business profiles
    if (dto.filter && dto.filter.length > 0) {
      const andClauses: Prisma.BusinessProfileWhereInput[] = [];
      for (const f of dto.filter) {
        const parts = f.split(':');
        if (parts.length >= 2) {
          const key = parts[0]!;
          const value = parts.slice(1).join(':');

          if (key === 'VerificationStatus') {
            andClauses.push({
              verification: { status: value as Prisma.EnumVerificationStatusFilter },
            });
          } else if (key === 'BusinessType') {
            andClauses.push({ businessType: value as Prisma.EnumBusinessTypeFilter });
          }
        }
      }
      if (andClauses.length > 0) {
        where.AND = andClauses;
      }
    }

    // Sorting
    let orderBy:
      | Prisma.BusinessProfileOrderByWithRelationInput
      | Prisma.BusinessProfileOrderByWithRelationInput[];
    switch (dto.sort) {
      case BusinessSortOption.NEWEST:
        orderBy = { createdAt: 'desc' };
        break;
      case BusinessSortOption.POPULAR:
        // Could sort by related DiscoveryItems score, but for MVP, we might just sort by related discovery items saves.
        // Wait, BusinessProfile sorting by popularity would require aggregating over DiscoveryItems in Prisma.
        // Instead, we just fallback to newest for MVP if it's too complex.
        // Prisma doesn't easily support ORDER BY aggregate of related records natively.
        orderBy = { createdAt: 'desc' };
        break;
      case BusinessSortOption.DISTANCE:
      case BusinessSortOption.RELEVANCE:
      default:
        // TODO: Distance, Popularity and Relevance sorting require raw SQL.
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [items, total] = await Promise.all([
      this.prisma.businessProfile.findMany({
        where,
        orderBy,
        skip: Math.max(0, dto.offset ?? 0),
        take: Math.min(Math.max(1, dto.limit ?? 20), 100),
        include: {
          categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
          tags: { select: { tag: true } },
        },
      }),
      this.prisma.businessProfile.count({ where }),
    ]);

    return { items, total };
  }
}
