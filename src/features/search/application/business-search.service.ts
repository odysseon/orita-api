import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SearchBusinessesDto, BusinessSortOption } from '../dto/search.dto.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';

@Injectable()
export class BusinessSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  async search(dto: SearchBusinessesDto) {
    let businessProfileIds: string[] | undefined = undefined;

    // Step 1: Geospatial pre-filter
    if (dto.lat !== undefined && dto.lng !== undefined) {
      const locations = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT DISTINCT bp.id
        FROM "business_profiles" bp
        LEFT JOIN "business_service_areas" bsa ON bp.id = bsa."businessProfileId" AND bsa.enabled = true
        LEFT JOIN "business_locations" bl ON bl."businessProfileId" = bp.id AND bl."isPrimary" = true
        LEFT JOIN "locations" loc ON loc.id = bl."locationId"
        WHERE 
          -- Has matching service area
          (bsa.id IS NOT NULL AND (
            bsa.type = 'NATIONWIDE'::"ServiceAreaType"
            OR bsa.type = 'REMOTE'::"ServiceAreaType"
            OR (bsa.type = 'RADIUS'::"ServiceAreaType" AND ST_DWithin(
              bsa."centerGeography",
              ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography,
              bsa."radiusKm" * 1000
            ))
            OR (bsa.type = 'POLYGON'::"ServiceAreaType" AND ST_Contains(
              bsa."polygonGeometry"::geometry,
              ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geometry
            ))
          ))
          OR
          -- Fallback for legacy profiles lacking active service areas
          (bsa.id IS NULL AND loc.coordinates IS NOT NULL AND ST_DWithin(
            loc.coordinates::geography,
            ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography,
            15000
          ))
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
    // Or other factors that apply to business profiles
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
          media: {
            where: { role: 'LOGO' },
            select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
          },
        },
      }),
      this.prisma.businessProfile.count({ where }),
    ]);

    const mappedItems = items.map((item) => {
      const { media, ...rest } = item;
      return {
        ...rest,
        logoUrl: media?.[0]
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
