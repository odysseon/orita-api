import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../shared/redis/redis.service.js';
import { IUserRepository } from '../core/ports/user.repository.interface.js';
import { UpdateUserProfileDto } from '../delivery/http/dto/update-user-profile.dto.js';
import { UpdateExplorationContextDto } from '../delivery/http/dto/update-exploration-context.dto.js';

import { UserEntity } from '../core/domain/user.types.js';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
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

  async create(accountId: string, username: string, avatarUrl?: string): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        accountId,
        username,
        avatarUrl: avatarUrl ?? null,
      },
      include: {
        account: {
          select: {
            email: true,
          },
        },
      },
    });

    const { account, ...rest } = user;
    const domain = {
      ...rest,
      role: user.role,
      businessId: null,
      email: account.email,
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
      },
    });

    if (!user) return null;

    const { account, businessProfile, ...rest } = user;
    const domain = {
      ...rest,
      role: user.role,
      email: account.email,
      businessId: businessProfile?.id || null,
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
          ...(payload.avatarUrl !== undefined && { avatarUrl: payload.avatarUrl }),
          ...(payload.avatarId !== undefined && { avatarId: payload.avatarId }),
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
        },
      });

      const { account, businessProfile, ...rest } = updatedUser;
      const domain = {
        ...rest,
        email: account.email,
        role: updatedUser.role,
        businessId: businessProfile?.id || null,
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
        },
      });

      const { account, businessProfile, ...rest } = updatedUser;
      const domain = {
        ...rest,
        email: account.email,
        role: updatedUser.role,
        businessId: businessProfile?.id || null,
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

  async addInterest(accountId: string, categoryId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.userInterestedCategory.upsert({
      where: {
        userId_categoryId: {
          userId: user.id,
          categoryId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        categoryId,
      },
    });

    await this.redisService.del(this.getCacheKey(accountId));
  }

  async removeInterest(accountId: string, categoryId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    try {
      await this.prisma.userInterestedCategory.delete({
        where: {
          userId_categoryId: {
            userId: user.id,
            categoryId,
          },
        },
      });
      await this.redisService.del(this.getCacheKey(accountId));
    } catch (e: any) {
      if (e.code === 'P2025') {
        // Not found, silently ignore
        return;
      }
      throw e;
    }
  }
}
