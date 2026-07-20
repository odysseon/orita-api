import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type FollowTargetType = 'business' | 'location' | 'user';

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async follow(followerId: string, type: FollowTargetType, targetId: string) {
    let follow;
    switch (type) {
      case 'business':
        follow = await this.prisma.businessFollow.upsert({
          where: { userId_businessId: { userId: followerId, businessId: targetId } },
          create: { userId: followerId, businessId: targetId },
          update: {},
        });
        break;
      case 'location':
        follow = await this.prisma.locationFollow.upsert({
          where: { userId_locationId: { userId: followerId, locationId: targetId } },
          create: { userId: followerId, locationId: targetId },
          update: {},
        });
        break;
      case 'user':
        follow = await this.prisma.userFollow.upsert({
          where: { followerId_followingId: { followerId, followingId: targetId } },
          create: { followerId, followingId: targetId },
          update: {},
        });
        break;
    }

    this.eventEmitter.emit(`follow.${type}.created`, { followerId, [type + 'Id']: targetId });
    return follow;
  }

  async unfollow(followerId: string, type: FollowTargetType, targetId: string): Promise<void> {
    try {
      switch (type) {
        case 'business':
          await this.prisma.businessFollow.delete({
            where: { userId_businessId: { userId: followerId, businessId: targetId } },
          });
          break;
        case 'location':
          await this.prisma.locationFollow.delete({
            where: { userId_locationId: { userId: followerId, locationId: targetId } },
          });
          break;
        case 'user':
          await this.prisma.userFollow.delete({
            where: { followerId_followingId: { followerId, followingId: targetId } },
          });
          break;
      }
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
    let follow;
    switch (type) {
      case 'business':
        follow = await this.prisma.businessFollow.findUnique({
          where: { userId_businessId: { userId: followerId, businessId: targetId } },
          select: { id: true },
        });
        break;
      case 'location':
        follow = await this.prisma.locationFollow.findUnique({
          where: { userId_locationId: { userId: followerId, locationId: targetId } },
          select: { id: true },
        });
        break;
      case 'user':
        follow = await this.prisma.userFollow.findUnique({
          where: { followerId_followingId: { followerId, followingId: targetId } },
          select: { id: true },
        });
        break;
    }

    return { following: !!follow };
  }

  async getFollows(followerId: string, type?: FollowTargetType) {
    if (type === 'business') {
      return this.prisma.businessFollow.findMany({
        where: { userId: followerId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
              media: { where: { role: 'LOGO' }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'location') {
      return this.prisma.locationFollow.findMany({
        where: { userId: followerId },
        include: {
          location: {
            select: { id: true, name: true, formattedAddress: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'user') {
      return this.prisma.userFollow.findMany({
        where: { followerId },
        include: {
          following: {
            select: { id: true, username: true, media: { where: { role: 'AVATAR' }, take: 1 } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const businesses = await this.prisma.businessFollow.findMany({
      where: { userId: followerId },
      include: {
        business: {
          select: { id: true, name: true, slug: true, media: { where: { role: 'LOGO' }, take: 1 } },
        },
      },
    });

    const locations = await this.prisma.locationFollow.findMany({
      where: { userId: followerId },
      include: {
        location: { select: { id: true, name: true, formattedAddress: true } },
      },
    });

    const users = await this.prisma.userFollow.findMany({
      where: { followerId },
      include: {
        following: { select: { id: true, username: true, media: { where: { role: 'AVATAR' }, take: 1 } } },
      },
    });

    // Merge and sort
    const all = [...businesses, ...locations, ...users].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return all;
  }

  async setNotifications(
    followerId: string,
    type: FollowTargetType,
    targetId: string,
    enabled: boolean,
  ) {
    switch (type) {
      case 'business':
        return this.prisma.businessFollow.update({
          where: { userId_businessId: { userId: followerId, businessId: targetId } },
          data: { notificationsEnabled: enabled },
        });
      case 'location':
        return this.prisma.locationFollow.update({
          where: { userId_locationId: { userId: followerId, locationId: targetId } },
          data: { notificationsEnabled: enabled },
        });
      case 'user':
        return this.prisma.userFollow.update({
          where: { followerId_followingId: { followerId, followingId: targetId } },
          data: { notificationsEnabled: enabled },
        });
    }
  }
}
