import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../shared/redis/redis.service.js';
import { IUserRepository } from '../core/ports/user.repository.interface.js';
import { UpdateUserProfileDto } from '../delivery/http/dto/update-user-profile.dto.js';
import { UpdateExplorationContextDto } from '../delivery/http/dto/update-exploration-context.dto.js';
import { MediaUrlService } from '../../features/media/application/services/media-url.service.js';

import { UserEntity } from '../core/domain/user.types.js';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  private getCacheKey(accountId: string): string {
    return `user:accountId:${accountId}`;
  }

  private updateCacheAsync(user: UserEntity): void {
    Promise.resolve()
      .then(async () => {
        await this.redisService.set(this.getCacheKey(user.accountId), user);
      })
      .catch(() => {});
  }

  async create(accountId: string, username: string): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        accountId,
        username,
      },
      include: {
        account: {
          select: {
            email: true,
          },
        },
        media: {
          where: { role: 'AVATAR' },
          select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
        },
      },
    });

    const { account, ...rest } = user;
    const domain = {
      ...rest,
      role: user.role,
      businessId: null,
      email: account.email,
      avatarUrl: user.media?.[0]
        ? this.mediaUrlService.getMediaUrl(
            user.media[0].provider,
            user.media[0].fileId,
            user.media[0].mimeType,
            user.media[0].version,
            user.media[0].format,
          )
        : null,
    };
    this.updateCacheAsync(domain);
    return domain;
  }

  async findByAccountId(accountId: string): Promise<UserEntity | null> {
    const cached = await this.redisService.get<UserEntity>(this.getCacheKey(accountId));
    if (cached) return cached;
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      include: {
        account: {
          select: {
            email: true,
          },
        },
        businessProfile: {
          select: { id: true },
        },
        interestedCategories: {
          select: { categoryId: true },
        },
        media: {
          where: { role: 'AVATAR' },
          select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
        },
      },
    });

    if (!user) return null;

    const { account, businessProfile, ...rest } = user;
    const domain = {
      ...rest,
      role: user.role,
      email: account.email,
      businessId: businessProfile?.id || null,
      avatarUrl: user.media?.[0]
        ? this.mediaUrlService.getMediaUrl(
            user.media[0].provider,
            user.media[0].fileId,
            user.media[0].mimeType,
            user.media[0].version,
            user.media[0].format,
          )
        : null,
      interestedCategories: user.interestedCategories.map((c) => c.categoryId),
    };
    this.updateCacheAsync(domain);
    return domain;
  }

  async updateProfile(accountId: string, payload: UpdateUserProfileDto): Promise<UserEntity> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { accountId },
        data: {
          ...(payload.username !== undefined && { username: payload.username }),
          ...(payload.displayName !== undefined && { displayName: payload.displayName }),
          ...(payload.bio !== undefined && { bio: payload.bio }),
        },
        include: {
          account: {
            select: {
              email: true,
            },
          },
          businessProfile: {
            select: { id: true },
          },
          media: {
            where: { role: 'AVATAR' },
            select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
          },
        },
      });

      const { account, businessProfile, ...rest } = updatedUser;
      const domain = {
        ...rest,
        email: account.email,
        role: updatedUser.role,
        businessId: businessProfile?.id || null,
        avatarUrl: updatedUser.media?.[0]
          ? this.mediaUrlService.getMediaUrl(
              updatedUser.media[0].provider,
              updatedUser.media[0].fileId,
              updatedUser.media[0].mimeType,
              updatedUser.media[0].version,
              updatedUser.media[0].format,
            )
          : null,
      };
      this.updateCacheAsync(domain);
      return domain;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025' // Prisma "Record to update not found" code
      ) {
        throw new NotFoundException('User profile not found for this account.');
      }
      throw error;
    }
  }

  async updateExplorationContext(
    accountId: string,
    payload: UpdateExplorationContextDto,
  ): Promise<UserEntity> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { accountId },
        data: {
          activeExplorationLat: payload.latitude,
          activeExplorationLng: payload.longitude,
          activeExplorationName: payload.name,
        },
        include: {
          account: {
            select: {
              email: true,
            },
          },
          businessProfile: {
            select: { id: true },
          },
          media: {
            where: { role: 'AVATAR' },
            select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
          },
        },
      });

      const { account, businessProfile, ...rest } = updatedUser;
      const domain = {
        ...rest,
        email: account.email,
        role: updatedUser.role,
        businessId: businessProfile?.id || null,
        avatarUrl: updatedUser.media?.[0]
          ? this.mediaUrlService.getMediaUrl(
              updatedUser.media[0].provider,
              updatedUser.media[0].fileId,
              updatedUser.media[0].mimeType,
              updatedUser.media[0].version,
              updatedUser.media[0].format,
            )
          : null,
      };
      this.updateCacheAsync(domain);
      return domain;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025' // Prisma "Record to update not found" code
      ) {
        throw new NotFoundException('User profile not found for this account.');
      }
      throw error;
    }
  }

  async updateInterests(accountId: string, categoryIds: string[]): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.userInterestedCategory.deleteMany({
        where: { userId: user.id },
      });

      if (categoryIds.length > 0) {
        await tx.userInterestedCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            userId: user.id,
            categoryId,
          })),
          skipDuplicates: true,
        });
      }
    });

    await this.redisService.del(this.getCacheKey(accountId));
  }
}
