import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../../../generated/prisma/client.js';

export type FollowTargetType = 'business' | 'location';

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async follow(followerId: string, type: FollowTargetType, targetId: string) {
    const data =
      type === 'business'
        ? { followerId, businessId: targetId }
        : { followerId, locationId: targetId };

    const follow = await this.prisma.follow.upsert({
      where:
        type === 'business'
          ? { followerId_businessId: { followerId, businessId: targetId } }
          : { followerId_locationId: { followerId, locationId: targetId } },
      create: data,
      update: {}, // Do nothing if it exists
    });

    this.eventEmitter.emit(`follow.${type}.created`, { followerId, [type + 'Id']: targetId });
    return follow;
  }

  async unfollow(followerId: string, type: FollowTargetType, targetId: string): Promise<void> {
    try {
      await this.prisma.follow.delete({
        where:
          type === 'business'
            ? { followerId_businessId: { followerId, businessId: targetId } }
            : { followerId_locationId: { followerId, locationId: targetId } },
      });
      this.eventEmitter.emit(`follow.${type}.removed`, { followerId, [type + 'Id']: targetId });
    } catch {
      // Ignored if it doesn't exist
    }
  }

  async getStatus(
    followerId: string,
    type: FollowTargetType,
    targetId: string,
  ): Promise<{ following: boolean }> {
    const follow = await this.prisma.follow.findUnique({
      where:
        type === 'business'
          ? { followerId_businessId: { followerId, businessId: targetId } }
          : { followerId_locationId: { followerId, locationId: targetId } },
      select: { id: true },
    });

    return { following: !!follow };
  }

  async getFollows(followerId: string, type?: FollowTargetType) {
    const where: Prisma.FollowWhereInput = { followerId };

    if (type === 'business') {
      where.businessId = { not: null };
    } else if (type === 'location') {
      where.locationId = { not: null };
    }

    return this.prisma.follow.findMany({
      where,
      include: {
        business:
          type === 'business' || !type
            ? {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  media: { where: { role: 'LOGO' }, take: 1 },
                },
              }
            : false,
        location:
          type === 'location' || !type
            ? {
                select: { id: true, name: true, formattedAddress: true },
              }
            : false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setNotifications(
    followerId: string,
    type: FollowTargetType,
    targetId: string,
    enabled: boolean,
  ) {
    return this.prisma.follow.update({
      where:
        type === 'business'
          ? { followerId_businessId: { followerId, businessId: targetId } }
          : { followerId_locationId: { followerId, locationId: targetId } },
      data: { notificationsEnabled: enabled },
    });
  }
}
