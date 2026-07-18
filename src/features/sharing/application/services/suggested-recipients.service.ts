import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { SuggestedShareRecipientDto } from '../../api/dto/response.dto.js';
import { MediaUrlService } from '../../../media/application/services/media-url.service.js';
import { StorageProvider } from '../../../../../generated/prisma/client.js';

@Injectable()
export class SuggestedRecipientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  async getSuggestedRecipients(userId: string): Promise<SuggestedShareRecipientDto[]> {
    const participant = await this.prisma.participant.findUnique({
      where: { userId },
    });

    if (!participant) return [];

    // 1. Get recent direct conversations
    const recentConversations = await this.prisma.conversation.findMany({
      where: {
        type: 'DIRECT',
        participants: {
          some: { participantId: participant.id },
        },
      },
      include: {
        participants: {
          include: {
            participant: {
              include: {
                user: {
                  include: {
                    media: { where: { role: 'AVATAR' } },
                  },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
    });

    const suggestions = new Map<string, SuggestedShareRecipientDto>();

    // Helper to format avatar
    const getAvatar = (mediaArray: any[]) => {
      const m = mediaArray?.[0] as {
        provider: StorageProvider;
        fileId: string;
        mimeType: string;
        version?: string | null;
        format?: string | null;
      };
      if (!m) return undefined;
      return this.mediaUrlService.getMediaUrl(
        m.provider,
        m.fileId,
        m.mimeType,
        m.version,
        m.format,
      );
    };

    // Add recent conversationalists
    for (const conv of recentConversations) {
      const otherParticipant = conv.participants.find(
        (p) => p.participantId !== participant.id,
      )?.participant;
      const otherUser = otherParticipant?.user;

      if (otherUser && !suggestions.has(otherUser.id)) {
        const avatarUrl = getAvatar(otherUser.media);
        suggestions.set(otherUser.id, {
          userId: otherUser.id,
          username: otherUser.username,
          ...(otherUser.displayName ? { displayName: otherUser.displayName } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
        });
      }
    }

    // 2. Get mutual follows
    const followers = await this.prisma.userFollow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    const followerIds = new Set(followers.map((f) => f.followerId));

    const following = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          include: { media: { where: { role: 'AVATAR' } } },
        },
      },
    });

    for (const follow of following) {
      const otherUser = follow.following;
      if (followerIds.has(otherUser.id) && !suggestions.has(otherUser.id)) {
        const avatarUrl = getAvatar(otherUser.media);
        suggestions.set(otherUser.id, {
          userId: otherUser.id,
          username: otherUser.username,
          ...(otherUser.displayName ? { displayName: otherUser.displayName } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
        });
      }
    }

    return Array.from(suggestions.values());
  }
}
