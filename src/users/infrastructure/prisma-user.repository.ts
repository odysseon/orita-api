import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../shared/redis/redis.service.js';
import { IUserRepository } from '../core/ports/user.repository.interface.js';
import { UpdateUserProfileDto } from '../delivery/http/dto/update-user-profile.dto.js';
import { UpdateLocationDto } from '../delivery/http/dto/update-location.dto.js';
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
        location: true,
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

    if (!user) return null;

    const { account, businessProfile, ...rest } = user;
    const domain = {
      ...rest,
      role: user.role,
      email: account.email,
      businessId: businessProfile?.id || null,
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

  async updateLocation(accountId: string, payload: UpdateLocationDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true, locationId: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.locationId) {
      await this.prisma.$executeRaw`
        UPDATE "Location"
        SET coordinates = ST_SetSRID(ST_MakePoint(${payload.lng}, ${payload.lat}), 4326),
            name = COALESCE(${payload.name ?? null}, name),
            "formattedAddress" = COALESCE(${payload.formattedAddress ?? null}, "formattedAddress")
        WHERE id = ${user.locationId}
      `;
    } else {
      const result = await this.prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO "Location" (id, name, "formattedAddress", coordinates)
        VALUES (
          gen_random_uuid()::text,
          COALESCE(${payload.name ?? null}, 'Current Location'),
          COALESCE(${payload.formattedAddress ?? null}, 'Unknown'),
          ST_SetSRID(ST_MakePoint(${payload.lng}, ${payload.lat}), 4326)
        )
        RETURNING id;
      `;
      const first = result[0];
      if (first) {
        const newLocId = first.id;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { locationId: newLocId },
        });
      }
    }
  }
}
