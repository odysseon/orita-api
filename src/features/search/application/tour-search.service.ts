import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SearchToursDto, TourSortOption } from '../dto/search.dto.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';

@Injectable()
export class TourSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  async search(dto: SearchToursDto) {
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

      // If we filtered by location but found zero businesses, return early
      if (businessProfileIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    // Step 2: Build Prisma Query
    const where: Prisma.BusinessTourWhereInput = {
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
        { summary: { contains: dto.q, mode: 'insensitive' } },
      ];
    }

    // Sorting
    let orderBy:
      Prisma.BusinessTourOrderByWithRelationInput | Prisma.BusinessTourOrderByWithRelationInput[];
    switch (dto.sort) {
      case TourSortOption.NEWEST:
        orderBy = { createdAt: 'desc' };
        break;
      case TourSortOption.DISTANCE:
      case TourSortOption.RELEVANCE:
      default:
        // For MVP, we fallback to newest.
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [items, total] = await Promise.all([
      this.prisma.businessTour.findMany({
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
              locationId: true,
              verification: {
                select: {
                  status: true,
                },
              },
            },
          },
          highlights: true,
          media: {
            select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
          },
        },
      }),
      this.prisma.businessTour.count({ where }),
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
