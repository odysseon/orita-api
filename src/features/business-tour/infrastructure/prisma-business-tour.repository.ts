import { Injectable } from '@nestjs/common';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { IBusinessTourRepository } from '../domain/ports/business-tour.repository.port.js';
import { BusinessTour, BusinessTourStatus } from '../domain/types/business-tour.entity.js';
import {
  CreateBusinessTourInput,
  DiscoverBusinessToursInput,
  PaginatedBusinessTours,
  BusinessTourView,
  UpdateBusinessTourInput,
  PaginatedBusinessToursSummary,
} from '../domain/types/business-tour.types.js';
import {
  BusinessTour as PrismaBusinessTour,
  BusinessTourHighlight as PrismaBusinessTourHighlight,
  BusinessTourStatus as PrismaBusinessTourStatus,
  Media as PrismaMedia,
  Prisma,
} from '../../../../generated/prisma/client.js';

type PrismaBusinessTourWithRelations = PrismaBusinessTour & {
  highlights: PrismaBusinessTourHighlight[];
  media: PrismaMedia[];
};

@Injectable()
export class PrismaBusinessTourRepository extends IBusinessTourRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {
    super();
  }

  private toDomain(raw: PrismaBusinessTourWithRelations): BusinessTour {
    const sortedMedia = (raw.media ?? []).toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return {
      id: raw.id,
      businessProfileId: raw.businessProfileId,
      title: raw.title,
      summary: raw.summary,
      visitDate: raw.visitDate,
      status: raw.status as BusinessTourStatus,
      publishedAt: raw.publishedAt,
      createdById: raw.createdById,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      highlights: raw.highlights.map((h) => ({ id: h.id, value: h.value })),
      media: sortedMedia.map((m) => ({
        id: m.id,
        url: this.mediaUrlService.getMediaUrl(
          m.provider,
          m.fileId,
          m.mimeType,
          m.version,
          m.format,
        ),
        mediaType: m.mediaType,
        order: m.order,
        createdAt: m.createdAt,
      })),
    };
  }

  private toView(raw: PrismaBusinessTourWithRelations): BusinessTourView {
    return this.toDomain(raw);
  }

  async create(input: CreateBusinessTourInput): Promise<BusinessTour> {
    const raw = await this.prisma.businessTour.create({
      data: {
        businessProfileId: input.businessProfileId,
        title: input.title,
        summary: input.summary ?? null,
        visitDate: input.visitDate,
        createdById: input.createdById,
        status: PrismaBusinessTourStatus.DRAFT,
        highlights: {
          create: input.highlights?.map((value) => ({ value })) ?? [],
        },
      },
      include: {
        highlights: true,
        media: true,
      },
    });
    return this.toDomain(raw);
  }

  async findById(id: string): Promise<BusinessTourView | null> {
    const raw = await this.prisma.businessTour.findUnique({
      where: { id },
      include: {
        highlights: true,
        media: true,
      },
    });
    return raw ? this.toView(raw) : null;
  }

  async update(id: string, input: UpdateBusinessTourInput): Promise<BusinessTour> {
    const raw = await this.prisma.$transaction(async (tx) => {
      if (input.highlights !== undefined) {
        // Replace all highlights if provided
        await tx.businessTourHighlight.deleteMany({
          where: { businessTourId: id },
        });
      }

      const publishedAtUpdate =
        input.status === BusinessTourStatus.PUBLISHED ? { publishedAt: new Date() } : {};

      return tx.businessTour.update({
        where: { id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.summary !== undefined && { summary: input.summary }),
          ...(input.visitDate !== undefined && { visitDate: input.visitDate }),
          ...(input.status !== undefined && { status: input.status as PrismaBusinessTourStatus }),
          ...publishedAtUpdate,
          ...(input.highlights !== undefined && {
            highlights: {
              create: input.highlights.map((value) => ({ value })),
            },
          }),
        },
        include: {
          highlights: true,
          media: true,
        },
      });
    });

    return this.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.businessTour.delete({
      where: { id },
    });
  }

  async discover(input: DiscoverBusinessToursInput): Promise<PaginatedBusinessTours> {
    const where: Prisma.BusinessTourWhereInput = {
      ...(input.businessProfileId && { businessProfileId: input.businessProfileId }),
      ...(input.status && { status: input.status }),
    };

    const skip = (input.page - 1) * input.limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.businessTour.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          highlights: true,
          media: true,
        },
      }),
      this.prisma.businessTour.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toView(r)),
      total,
      page: input.page,
      limit: input.limit,
    };
  }

  async discoverGlobal(input: DiscoverBusinessToursInput): Promise<PaginatedBusinessToursSummary> {
    const limit = input.limit;
    const offset = (input.page - 1) * limit;

    // Use PostGIS if location is provided
    if (input.lat !== undefined && input.lng !== undefined) {

      const searchPattern = input.search ? `%${input.search}%` : '%';
      const statusFilter = input.status
        ? Prisma.sql`AND st.status = ${input.status}::"BusinessTourStatus"`
        : Prisma.empty;

      interface DiscoverTourRawRow {
        id: string;
        businessProfileId: string;
        businessProfileSlug: string;
        title: string;
        summary: string | null;
        visitDate: Date | null;
        status: PrismaBusinessTourStatus;
        publishedAt: Date | null;
        coverUrl: string | null;
        distanceMeters: number;
      }

      // Note: we fetch the cover media as a subquery or join.
      const rows = await this.prisma.$queryRaw<DiscoverTourRawRow[]>`
        SELECT 
          st.id,
          st."businessProfileId",
          st.title,
          st.summary,
          st."visitDate",
          st.status,
          st."publishedAt",
          bp.slug as "businessProfileSlug",
          ST_Distance(bp.location, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)) as "distanceMeters",
          (
            SELECT m.url 
            FROM media m 
            WHERE m."businessTourId" = st.id 
            ORDER BY m."order" ASC NULLS LAST, m."createdAt" ASC 
            LIMIT 1
          ) as "coverUrl"
        FROM store_tours st
        JOIN business_profiles bp ON st."businessProfileId" = bp.id
        WHERE (st.title ILIKE ${searchPattern} OR st.summary ILIKE ${searchPattern})
        ${statusFilter}
        ORDER BY "distanceMeters" ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count
        FROM store_tours st
        JOIN business_profiles bp ON st."businessProfileId" = bp.id
        WHERE (st.title ILIKE ${searchPattern} OR st.summary ILIKE ${searchPattern})
        ${statusFilter}
      `;

      return {
        items: rows.map((r) => ({
          id: r.id,
          businessProfileId: r.businessProfileId,
          businessProfileSlug: r.businessProfileSlug,
          title: r.title,
          summary: r.summary,
          visitDate: r.visitDate as Date,
          status: r.status as BusinessTourStatus,
          publishedAt: r.publishedAt,
          ...(r.coverUrl ? { coverUrl: r.coverUrl } : {}),
          ...(r.distanceMeters !== undefined ? { distanceKm: r.distanceMeters / 1000 } : {}),
        })),
        total: Number(count),
        page: input.page,
        limit,
      };
    }

    // Fallback to standard Prisma query without location
    const where: Prisma.BusinessTourWhereInput = {
      ...(input.status && { status: input.status }),
      ...(input.search && {
        OR: [
          { title: { contains: input.search, mode: 'insensitive' } },
          { summary: { contains: input.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.businessTour.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          businessProfile: { select: { slug: true } },
          media: {
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            take: 1,
          },
        },
      }),
      this.prisma.businessTour.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        businessProfileId: r.businessProfileId,
        businessProfileSlug: r.businessProfile.slug,
        title: r.title,
        summary: r.summary,
        visitDate: r.visitDate,
        status: r.status as BusinessTourStatus,
        publishedAt: r.publishedAt,
        ...(r.media[0] !== undefined
          ? {
              coverUrl: this.mediaUrlService.getMediaUrl(
                r.media[0].provider,
                r.media[0].fileId,
                r.media[0].mimeType,
                r.media[0].version,
                r.media[0].format,
              ),
            }
          : {}),
      })),
      total,
      page: input.page,
      limit,
    };
  }
}
