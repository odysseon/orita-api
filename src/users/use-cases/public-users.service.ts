import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  USER_REPOSITORY_TOKEN,
  type IUserRepository,
} from '../core/ports/user.repository.interface.js';
import { MediaUrlService } from '../../features/media/application/services/media-url.service.js';
import { buildActiveUserWhere } from '../core/queries/user-queries.js';

@Injectable()
export class PublicUsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  async getPublicProfile(username: string, viewerAccountId?: string) {
    const user = await this.prisma.user.findFirst({
      where: buildActiveUserWhere({ username }),
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        createdAt: true,
        businessProfile: {
          select: { id: true, name: true, slug: true, locationId: true },
        },
        media: {
          where: { role: 'AVATAR' },
          select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    let isFollowing = false;
    if (viewerAccountId) {
      const viewer = await this.userRepository.findByAccountId(viewerAccountId);
      if (viewer) {
        const follow = await this.prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewer.id,
              followingId: user.id,
            },
          },
        });
        isFollowing = !!follow;
      }
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      joinedAt: user.createdAt,
      avatarUrl: user.media?.[0]
        ? this.mediaUrlService.getMediaUrl(
            user.media[0].provider,
            user.media[0].fileId,
            user.media[0].mimeType,
            user.media[0].version ?? undefined,
            user.media[0].format ?? undefined,
          )
        : null,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      businessCount: user.businessProfile ? 1 : 0,
      businesses: user.businessProfile ? [user.businessProfile] : [],
      isFollowing,
    };
  }

  async followUser(followingUsername: string, followerAccountId: string) {
    const follower = await this.userRepository.findByAccountId(followerAccountId);
    if (!follower) {
      throw new NotFoundException('Your user profile was not found');
    }

    const following = await this.prisma.user.findFirst({
      where: buildActiveUserWhere({ username: followingUsername }),
    });
    if (!following) {
      throw new NotFoundException('User to follow not found');
    }

    if (follower.id === following.id) {
      throw new BadRequestException('You cannot follow yourself');
    }

    await this.prisma.userFollow.upsert({
      where: {
        followerId_followingId: {
          followerId: follower.id,
          followingId: following.id,
        },
      },
      create: {
        followerId: follower.id,
        followingId: following.id,
      },
      update: {},
    });

    return { success: true };
  }

  async unfollowUser(followingUsername: string, followerAccountId: string) {
    const follower = await this.userRepository.findByAccountId(followerAccountId);
    if (!follower) {
      throw new NotFoundException('Your user profile was not found');
    }

    const following = await this.prisma.user.findFirst({
      where: buildActiveUserWhere({ username: followingUsername }),
    });
    if (!following) {
      throw new NotFoundException('User to unfollow not found');
    }

    try {
      await this.prisma.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId: follower.id,
            followingId: following.id,
          },
        },
      });
    } catch {
      // Ignore if not following
    }

    return { success: true };
  }
}
