import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../shared/redis/redis.service.js';
import { IBusinessProfileRepository } from '../domain/ports/business-profile.repository.port.js';
import { BusinessProfile } from '../domain/types/business-profile.entity.js';
import {
  CreateBusinessProfileInput,
  DiscoverBusinessesInput,
  PaginatedBusinessSummaries,
  UpdateBusinessProfileInput,
  BusinessProfileView,
  BusinessSummary,
} from '../domain/types/business-profile.types.js';
import { SetOperatingHoursInput, DayOfWeek } from '../domain/types/operating-hours.types.js';

// Post-migration type guard
type PrismaBusinessProfileExtended = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  isPublic: boolean;
  businessType: BusinessProfile['businessType'];
  websiteUrl: string | null;
  description: string | null;
  contactPhone: string | null;
  whatsapp: string | null;
  contactEmail: string | null;
  locationId: string | null;
  categories?: { categoryId: string; isPrimary: boolean }[];
  createdAt: Date;
  updatedAt: Date;
  hours?: {
    id: string;
    businessProfileId: string;
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }[];
  tags?: {
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
  geoEntity?: {
    id: string;
    name: string;
  } | null;
  media?: {
    role: 'LOGO' | 'BANNER' | 'COVER' | 'GALLERY';
    url: string;
  }[];
};

type HydratedProfile = PrismaBusinessProfileExtended & {
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
};

function toDomain(raw: HydratedProfile): BusinessProfileView {
  const avatarUrl = raw.media?.find((m) => m.role === 'LOGO')?.url;
  const coverUrl = raw.media?.find((m) => m.role === 'BANNER')?.url;

  return {
    id: raw.id,
    ownerId: raw.ownerId,
    name: raw.name,
    slug: raw.slug,
    businessType: raw.businessType,
    isPublic: raw.isPublic,
    description: raw.description,
    contactPhone: raw.contactPhone,
    whatsapp: raw.whatsapp,
    contactEmail: raw.contactEmail,
    websiteUrl: raw.websiteUrl,
    locationId: raw.locationId,
    location: raw.locationName,
    latitude: raw.latitude,
    longitude: raw.longitude,
    primaryCategoryId: raw.categories?.find((c) => c.isPrimary)?.categoryId ?? null,
    secondaryCategoryIds:
      raw.categories?.filter((c) => !c.isPrimary).map((c) => c.categoryId) ?? [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    ...(raw.hours && {
      operatingHours: raw.hours.map((h) => ({
        id: h.id,
        businessProfileId: h.businessProfileId,
        day: h.day as DayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      })),
    }),
    ...(raw.tags && {
      tags: raw.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        slug: t.tag.slug,
      })),
    }),
    ...(avatarUrl && { avatarUrl }),
    ...(coverUrl && { coverUrl }),
  };
}

@Injectable()
export class PrismaBusinessProfileRepository extends IBusinessProfileRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  private getCacheKey(id: string): string {
    return `businessProfile:id:${id}`;
  }

  private getSlugCacheKey(slug: string): string {
    return `businessProfile:slug:${slug}`;
  }

  private updateCacheAsync(profile: BusinessProfileView): void {
    Promise.resolve()
      .then(async () => {
        await this.redisService.set(this.getCacheKey(profile.id), profile);
        await this.redisService.set(this.getSlugCacheKey(profile.slug), profile);
      })
      .catch(() => {});
  }

  private deleteCacheAsync(id: string, slug: string): void {
    Promise.resolve()
      .then(async () => {
        await this.redisService.del(this.getCacheKey(id));
        await this.redisService.del(this.getSlugCacheKey(slug));
      })
      .catch(() => {});
  }

  private async hydrate(profiles: PrismaBusinessProfileExtended[]): Promise<HydratedProfile[]> {
    if (profiles.length === 0) return [];

    const locationIds = profiles.map((p) => p.locationId).filter((id): id is string => id !== null);
    const locationMap = new Map<string, { lat: number; lng: number }>();

    if (locationIds.length > 0) {
      const coords = await this.prisma.$queryRaw<{ id: string; lat: number; lng: number }[]>`
        SELECT id, ST_Y(coordinates::geometry) as lat, ST_X(coordinates::geometry) as lng
        FROM "locations"
        WHERE id IN (${Prisma.join(locationIds)})
      `;
      for (const row of coords) {
        locationMap.set(row.id, { lat: row.lat, lng: row.lng });
      }
    }

    return profiles.map((p) => {
      const coords = p.locationId ? locationMap.get(p.locationId) : undefined;
      return {
        ...p,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        locationName: p.geoEntity?.name ?? null,
      };
    });
  }

  async create(input: CreateBusinessProfileInput, slug: string): Promise<BusinessProfileView> {
    let locationId: string | undefined = undefined;

    if (input.latitude !== undefined && input.longitude !== undefined) {
      const newLocId = crypto.randomUUID();
      await this.prisma.$executeRaw`
        INSERT INTO "locations" (id, provider, name, "formattedAddress", coordinates, latitude, longitude, "createdAt", "updatedAt")
        VALUES (${newLocId}, 'CUSTOM', ${input.location ?? 'Business Location'}, ${input.location ?? 'Business Location'}, ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326), ${input.latitude}, ${input.longitude}, NOW(), NOW())
      `;
      locationId = newLocId;
    } else if (input.location !== undefined && input.location !== null) {
      const newLocId = crypto.randomUUID();
      await this.prisma.$executeRaw`
        INSERT INTO "locations" (id, provider, name, "formattedAddress", coordinates, latitude, longitude, "createdAt", "updatedAt")
        VALUES (${newLocId}, 'CUSTOM', ${input.location}, ${input.location}, ST_SetSRID(ST_MakePoint(0, 0), 4326), 0, 0, NOW(), NOW())
      `;
      locationId = newLocId;
    }

    const raw = await this.prisma.businessProfile.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        slug,
        ...(input.businessType !== undefined && { businessType: input.businessType }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl }),
        ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
        ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
        ...(locationId !== undefined && { locationId }),
        ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
        ...(input.primaryCategoryId && {
          categories: {
            create: [
              { categoryId: input.primaryCategoryId, isPrimary: true },
              ...(input.secondaryCategoryIds?.map((id) => ({ categoryId: id, isPrimary: false })) ??
                []),
            ],
          },
        }),
      },
      include: { geoEntity: true, categories: { select: { categoryId: true, isPrimary: true } } },
    });

    const hydratedArray = await this.hydrate([raw]);
    const domain = toDomain(hydratedArray[0]!);
    this.updateCacheAsync(domain);

    const user = await this.prisma.user.findUnique({
      where: { id: input.ownerId },
      select: { accountId: true },
    });
    if (user) {
      this.redisService.del(`user:accountId:${user.accountId}`).catch(() => {});
    }

    return domain;
  }

  async findById(id: string): Promise<BusinessProfileView | null> {
    const cached = await this.redisService.get<BusinessProfileView>(this.getCacheKey(id));
    if (cached) {
      return {
        ...cached,
        createdAt: cached.createdAt ? new Date(cached.createdAt) : cached.createdAt,
        updatedAt: cached.updatedAt ? new Date(cached.updatedAt) : cached.updatedAt,
      };
    }

    const raw = await this.prisma.businessProfile.findUnique({
      where: { id },
      include: {
        hours: true,
        tags: { include: { tag: true } },
        geoEntity: true,
        categories: { select: { categoryId: true, isPrimary: true } },
        media: { select: { role: true, url: true } },
      },
    });
    if (!raw) return null;
    const hydratedArray = await this.hydrate([raw]);
    const domain = toDomain(hydratedArray[0]!);
    this.updateCacheAsync(domain);
    return domain;
  }

  async findBySlug(slug: string): Promise<BusinessProfileView | null> {
    const cached = await this.redisService.get<BusinessProfileView>(this.getSlugCacheKey(slug));
    if (cached) {
      return {
        ...cached,
        createdAt: cached.createdAt ? new Date(cached.createdAt) : cached.createdAt,
        updatedAt: cached.updatedAt ? new Date(cached.updatedAt) : cached.updatedAt,
      };
    }

    const raw = await this.prisma.businessProfile.findUnique({
      where: { slug },
      include: {
        hours: true,
        tags: { include: { tag: true } },
        geoEntity: true,
        categories: { select: { categoryId: true, isPrimary: true } },
        media: { select: { role: true, url: true } },
      },
    });
    if (!raw) return null;
    const hydratedArray = await this.hydrate([raw]);
    const domain = toDomain(hydratedArray[0]!);
    this.updateCacheAsync(domain);
    return domain;
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const count = await this.prisma.businessProfile.count({ where: { slug } });
    return count > 0;
  }

  async findByOwner(ownerId: string): Promise<BusinessProfileView | null> {
    const raw = await this.prisma.businessProfile.findUnique({
      where: { ownerId },
      include: {
        hours: true,
        tags: { include: { tag: true } },
        geoEntity: true,
        categories: { select: { categoryId: true, isPrimary: true } },
      },
    });
    if (!raw) return null;
    const hydratedArray = await this.hydrate([raw]);
    return toDomain(hydratedArray[0]!);
  }

  async update(id: string, input: UpdateBusinessProfileInput): Promise<BusinessProfileView> {
    const existing = await this.prisma.businessProfile.findUnique({ where: { id } });
    if (!existing) throw new Error('BusinessProfile not found');

    let locationId = existing.locationId;

    if (input.latitude !== undefined && input.longitude !== undefined) {
      if (locationId) {
        await this.prisma.$executeRaw`
          UPDATE "locations"
          SET coordinates = ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326),
              latitude = ${input.latitude},
              longitude = ${input.longitude},
              "updatedAt" = NOW(),
              name = COALESCE(${input.location ?? null}, name),
              "formattedAddress" = COALESCE(${input.location ?? null}, "formattedAddress")
          WHERE id = ${locationId}
        `;
      } else {
        const newLocId = crypto.randomUUID();
        await this.prisma.$executeRaw`
          INSERT INTO "locations" (id, provider, name, "formattedAddress", coordinates, latitude, longitude, "createdAt", "updatedAt")
          VALUES (${newLocId}, 'CUSTOM', ${input.location ?? 'Business Location'}, ${input.location ?? 'Business Location'}, ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326), ${input.latitude}, ${input.longitude}, NOW(), NOW())
        `;
        locationId = newLocId;
      }
    } else if (input.location !== undefined && input.location !== null) {
      if (locationId) {
        await this.prisma.$executeRaw`
          UPDATE "locations" SET name = ${input.location}, "formattedAddress" = ${input.location}, "updatedAt" = NOW() WHERE id = ${locationId}
        `;
      } else {
        const newLocId = crypto.randomUUID();
        await this.prisma.$executeRaw`
          INSERT INTO "locations" (id, provider, name, "formattedAddress", coordinates, latitude, longitude, "createdAt", "updatedAt")
          VALUES (${newLocId}, 'CUSTOM', ${input.location}, ${input.location}, ST_SetSRID(ST_MakePoint(0, 0), 4326), 0, 0, NOW(), NOW())
        `;
        locationId = newLocId;
      }
    }

    const raw = await this.prisma.businessProfile.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.businessType !== undefined && { businessType: input.businessType }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl }),
        ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
        ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
        ...(locationId !== undefined && { locationId }),
        ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
        ...(input.primaryCategoryId !== undefined && {
          categories: {
            deleteMany: {},
            create: [
              { categoryId: input.primaryCategoryId, isPrimary: true },
              ...(input.secondaryCategoryIds?.map((id) => ({ categoryId: id, isPrimary: false })) ??
                []),
            ],
          },
        }),
      },
      include: {
        hours: true,
        tags: { include: { tag: true } },
        geoEntity: true,
        categories: { select: { categoryId: true, isPrimary: true } },
      },
    });

    const hydratedArray = await this.hydrate([raw]);
    const domain = toDomain(hydratedArray[0]!);
    this.updateCacheAsync(domain);
    return domain;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return;

    await this.prisma.businessProfile.delete({ where: { id } });
    this.deleteCacheAsync(existing.id, existing.slug);

    const user = await this.prisma.user.findUnique({
      where: { id: existing.ownerId },
      select: { accountId: true },
    });
    if (user) {
      this.redisService.del(`user:accountId:${user.accountId}`).catch(() => {});
    }
  }

  async setOperatingHours(businessId: string, hours: SetOperatingHoursInput[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.operatingHours.deleteMany({
        where: { businessProfileId: businessId },
      });
      if (hours.length > 0) {
        await tx.operatingHours.createMany({
          data: hours.map((h) => ({
            businessProfileId: businessId,
            day: h.day,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          })),
        });
      }
    });

    const updated = await this.findById(businessId);
    if (updated) this.updateCacheAsync(updated);
  }

  async setTags(businessId: string, tagIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.businessProfileTag.deleteMany({
        where: { businessProfileId: businessId },
      });
      if (tagIds.length > 0) {
        await tx.businessProfileTag.createMany({
          data: tagIds.map((tagId) => ({
            businessProfileId: businessId,
            tagId,
          })),
        });
      }
    });

    const updated = await this.findById(businessId);
    if (updated) this.updateCacheAsync(updated);
  }

  async discover(input: DiscoverBusinessesInput): Promise<PaginatedBusinessSummaries> {
    const where: Prisma.BusinessProfileWhereInput = {
      isPublic: true,
      // Category filter: exact leaf or root-slug relation filter
      ...(input.categoryId && { categories: { some: { categoryId: input.categoryId } } }),
      ...(input.rootSlug &&
        !input.categoryId && {
          categories: { some: { category: { parent: { slug: input.rootSlug } } } },
        }),
      ...(input.search && {
        OR: [
          { name: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
          { geoEntity: { name: { contains: input.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const skip = (input.page - 1) * input.limit;

    if (input.lat !== undefined && input.lng !== undefined) {
      const radiusMeters = (input.radiusInKm ?? 10) * 1000;

      const rawItems = await this.prisma.$queryRaw<
        {
          id: string;
          name: string;
          slug: string;
          businessType: BusinessProfile['businessType'];
          description: string | null;
          location: string | null;
          latitude: number;
          longitude: number;
          categories_json: string[];
          distance: number;
        }[]
      >`
        SELECT bp.id, bp.name, bp.slug, bp."businessType", bp.description, loc.name as location, 
               ST_Y(loc.coordinates::geometry) as latitude, ST_X(loc.coordinates::geometry) as longitude,
               COALESCE((
                 SELECT json_agg(json_build_object('categoryId', bc."categoryId", 'isPrimary', bc."isPrimary"))
                 FROM "business_categories" bc
                 WHERE bc."businessId" = bp.id
               ), '[]'::json) as categories_json,
               (ST_Distance(loc.coordinates::geography, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography) / 1000) AS distance
        FROM "business_profiles" bp
        JOIN "locations" loc ON bp."locationId" = loc.id
        WHERE bp."isPublic" = true
          AND ST_DWithin(loc.coordinates::geography, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography, ${radiusMeters})
          ${input.categoryId ? Prisma.sql`AND EXISTS (SELECT 1 FROM "business_categories" bc WHERE bc."businessId" = bp.id AND bc."categoryId" = ${input.categoryId})` : Prisma.empty}
          ${
            input.search
              ? Prisma.sql`AND (
                  bp.name ILIKE ${'%' + input.search + '%'} OR 
                  bp.description ILIKE ${'%' + input.search + '%'} OR 
                  loc.name ILIKE ${'%' + input.search + '%'}
                )`
              : Prisma.empty
          }
        ORDER BY distance ASC
        LIMIT ${input.limit}
        OFFSET ${skip};
      `;

      const countResult = await this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) as total 
        FROM "business_profiles" bp
        JOIN "locations" loc ON bp."locationId" = loc.id
        WHERE bp."isPublic" = true
          AND ST_DWithin(loc.coordinates::geography, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography, ${radiusMeters})
          ${input.categoryId ? Prisma.sql`AND EXISTS (SELECT 1 FROM "business_categories" bc WHERE bc."businessId" = bp.id AND bc."categoryId" = ${input.categoryId})` : Prisma.empty}
          ${
            input.search
              ? Prisma.sql`AND (
                  bp.name ILIKE ${'%' + input.search + '%'} OR 
                  bp.description ILIKE ${'%' + input.search + '%'} OR 
                  loc.name ILIKE ${'%' + input.search + '%'}
                )`
              : Prisma.empty
          };
      `;

      const total = Number(countResult[0]?.total ?? 0);

      const items = rawItems.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        businessType: r.businessType,
        description: r.description,
        location: r.location,
        latitude: r.latitude,
        longitude: r.longitude,
        primaryCategoryId:
          (r.categories_json as unknown as { categoryId: string; isPrimary: boolean }[])?.find(
            (c) => c.isPrimary,
          )?.categoryId ?? null,
        secondaryCategoryIds:
          (r.categories_json as unknown as { categoryId: string; isPrimary: boolean }[])
            ?.filter((c) => !c.isPrimary)
            .map((c) => c.categoryId) ?? [],
        distanceKm: Number(r.distance),
      }));

      return this.enrichWithFollowedStatus(
        items,
        total,
        input.page,
        input.limit,
        input.currentUserId,
      );
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.businessProfile.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          businessType: true,
          description: true,
          locationId: true,
          categories: { select: { categoryId: true, isPrimary: true } },
          geoEntity: true,
        },
      }),
      this.prisma.businessProfile.count({ where }),
    ]);

    const hydrated = await this.hydrate(items as unknown as PrismaBusinessProfileExtended[]);

    const itemsMapped = hydrated.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      businessType: r.businessType,
      description: r.description,
      location: r.locationName,
      latitude: r.latitude,
      longitude: r.longitude,
      primaryCategoryId: r.categories?.find((c) => c.isPrimary)?.categoryId ?? null,
      secondaryCategoryIds:
        r.categories?.filter((c) => !c.isPrimary).map((c) => c.categoryId) ?? [],
    }));

    return this.enrichWithFollowedStatus(
      itemsMapped,
      total,
      input.page,
      input.limit,
      input.currentUserId,
    );
  }

  private async enrichWithFollowedStatus(
    items: BusinessSummary[],
    total: number,
    page: number,
    limit: number,
    currentUserId?: string,
  ): Promise<PaginatedBusinessSummaries> {
    if (!currentUserId || items.length === 0) {
      return { items, total, page, limit };
    }

    const businessIds = items.map((i) => i.id);
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        businessId: { in: businessIds },
      },
      select: { businessId: true },
    });

    const followedSet = new Set(follows.map((s) => s.businessId));

    return {
      items: items.map((i: BusinessSummary) => ({
        ...i,
        isFollowed: followedSet.has(i.id),
      })),
      total,
      page,
      limit,
    };
  }
}
