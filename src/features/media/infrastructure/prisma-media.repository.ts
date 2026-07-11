import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../shared/redis/redis.service.js';
import { IMediaRepository, MediaOwnerKey } from '../domain/ports/media.repository.port.js';
import { Media } from '../domain/types/media.entity.js';
import { MediaRole } from '../domain/types/media-role.enum.js';
import { AddMediaInput, ReorderMediaInput } from '../domain/types/media.types.js';
import { Media as PrismaMedia, Prisma } from '../../../../generated/prisma/client.js';

function toDomain(raw: PrismaMedia): Media {
  return {
    id: raw.id,
    businessProfileId: raw.businessProfileId,
    listingId: raw.listingId,
    businessTourId: raw.businessTourId,
    reviewId: raw.reviewId,
    url: raw.url,
    fileId: raw.fileId,
    mediaType: raw.mediaType,
    role: raw.role,
    order: raw.order,
    createdAt: raw.createdAt,
  };
}

@Injectable()
export class PrismaMediaRepository extends IMediaRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  // fallow-ignore-next-line complexity
  private async invalidateParentCache(ownerKey: string, ownerId: string): Promise<void> {
    if (ownerKey === 'businessProfileId') {
      const bp = await this.prisma.businessProfile.findUnique({
        where: { id: ownerId },
        select: { slug: true },
      });
      if (bp) {
        await this.redisService.del(`businessProfile:id:${ownerId}`).catch(() => {});
        await this.redisService.del(`businessProfile:slug:${bp.slug}`).catch(() => {});
      }
    } else if (ownerKey === 'listingId') {
      const listing = await this.prisma.listing.findUnique({
        where: { id: ownerId },
        select: { slug: true },
      });
      if (listing) {
        await this.redisService.del(`listing:id:${ownerId}`).catch(() => {});
        await this.redisService.del(`listing:slug:${listing.slug}`).catch(() => {});
      }
    }
  }

  async add(input: AddMediaInput): Promise<Media> {
    const data: Prisma.MediaUncheckedCreateInput = {
      url: input.url,
      fileId: input.fileId,
      mediaType: input.mediaType,
      role: input.role,
      order: input.order ?? null,
      provider: input.provider,
      mimeType: input.mimeType,
    };
    
    if (input.businessProfileId !== undefined) data.businessProfileId = input.businessProfileId;
    if (input.listingId !== undefined) data.listingId = input.listingId;
    if (input.businessTourId !== undefined) data.businessTourId = input.businessTourId;
    if (input.reviewId !== undefined) data.reviewId = input.reviewId;
    
    if (input.bytes !== undefined) data.bytes = input.bytes;
    if (input.width !== undefined) data.width = input.width;
    if (input.height !== undefined) data.height = input.height;
    if (input.duration !== undefined) data.duration = input.duration;
    if (input.version !== undefined) data.version = input.version;
    if (input.format !== undefined) data.format = input.format;

    const raw = await this.prisma.media.create({ data });
    if (input.businessProfileId) {
      await this.invalidateParentCache('businessProfileId', input.businessProfileId);
    } else if (input.listingId) {
      await this.invalidateParentCache('listingId', input.listingId);
    }
    return toDomain(raw);
  }

  async findByOwner(ownerKey: MediaOwnerKey, ownerId: string): Promise<Media[]> {
    const rows = await this.prisma.media.findMany({
      where: { [ownerKey]: ownerId },
      orderBy: [{ role: 'asc' }, { order: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async findByRole(ownerKey: MediaOwnerKey, ownerId: string, role: MediaRole): Promise<Media[]> {
    const rows = await this.prisma.media.findMany({
      where: { [ownerKey]: ownerId, role },
      orderBy: { order: 'asc' },
    });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Media | null> {
    const raw = await this.prisma.media.findUnique({ where: { id } });
    return raw ? toDomain(raw) : null;
  }

  async reorder(
    ownerKey: MediaOwnerKey,
    ownerId: string,
    input: ReorderMediaInput,
  ): Promise<Media[]> {
    // Only reorders GALLERY items — singleton roles are excluded at the use case level
    await this.prisma.$transaction(
      input.orderedIds.map((id, index) =>
        this.prisma.media.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    await this.invalidateParentCache(ownerKey, ownerId);

    return this.findByRole(ownerKey, ownerId, MediaRole.GALLERY);
  }

  async delete(id: string): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: { id },
      select: { businessProfileId: true, listingId: true },
    });
    if (media) {
      await this.prisma.media.delete({ where: { id } });
      if (media.businessProfileId) {
        await this.invalidateParentCache('businessProfileId', media.businessProfileId);
      } else if (media.listingId) {
        await this.invalidateParentCache('listingId', media.listingId);
      }
    }
  }

  async renormalize(ownerKey: MediaOwnerKey, ownerId: string): Promise<void> {
    // Only renormalizes GALLERY items — singletons have no order to renormalize
    const items = await this.prisma.media.findMany({
      where: { [ownerKey]: ownerId, role: MediaRole.GALLERY },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    await this.prisma.$transaction(
      items.map((item, index) =>
        this.prisma.media.update({
          where: { id: item.id },
          data: { order: index },
        }),
      ),
    );

    await this.invalidateParentCache(ownerKey, ownerId);
  }

  async countByOwner(ownerKey: MediaOwnerKey, ownerId: string): Promise<number> {
    return this.prisma.media.count({ where: { [ownerKey]: ownerId } });
  }

  async countByRole(ownerKey: MediaOwnerKey, ownerId: string, role: MediaRole): Promise<number> {
    return this.prisma.media.count({ where: { [ownerKey]: ownerId, role } });
  }
}
