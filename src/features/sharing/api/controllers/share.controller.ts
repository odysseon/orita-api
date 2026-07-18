import { Controller, Post, Get, Body, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { InternalShareDto } from '../dto/request.dto.js';
import {
  ShareResultDto,
  SuggestedShareRecipientDto,
  RecentShareableDto,
} from '../dto/response.dto.js';
import { ShareService } from '../../application/services/share.service.js';
import { SuggestedRecipientsService } from '../../application/services/suggested-recipients.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { MediaUrlService } from '../../../media/application/services/media-url.service.js';
import { StorageProvider } from '../../../../../generated/prisma/client.js';

@ApiTags('Sharing')
@Controller()
export class ShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly suggestedRecipientsService: SuggestedRecipientsService,
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  private async resolveUser(accountId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User profile not found.');
    return user.id;
  }

  @Post('share/internal')
  @ApiOperation({ summary: 'Share an entity with internal users' })
  @ApiResponse({ type: [ShareResultDto] })
  async shareInternal(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() dto: InternalShareDto,
  ): Promise<ShareResultDto[]> {
    const userId = await this.resolveUser(identity.accountId);
    return this.shareService.share({
      senderId: userId,
      recipientIds: dto.recipientIds,
      embedType: dto.embedType,
      targetId: dto.targetId,
      ...(dto.content ? { content: dto.content } : {}),
    });
  }

  @Get('sharing/suggested-recipients')
  @ApiOperation({ summary: 'Get suggested recipients for sharing' })
  @ApiResponse({ type: [SuggestedShareRecipientDto] })
  async getSuggestedRecipients(
    @CurrentIdentity() identity: RequestIdentity,
  ): Promise<SuggestedShareRecipientDto[]> {
    const userId = await this.resolveUser(identity.accountId);
    return this.suggestedRecipientsService.getSuggestedRecipients(userId);
  }

  @Get('sharing/recent')
  @ApiOperation({ summary: 'Get recently shared entities' })
  @ApiResponse({ type: [RecentShareableDto] })
  async getRecentShares(
    @CurrentIdentity() identity: RequestIdentity,
  ): Promise<RecentShareableDto[]> {
    const userId = await this.resolveUser(identity.accountId);

    // Find recent shares involving this user
    const recentShares = await this.prisma.itemShare.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
        embedType: { in: ['BUSINESS', 'LISTING', 'TOUR'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const uniqueTargets = new Map<
      string,
      { embedType: string; targetId: string; createdAt: Date }
    >();

    for (const share of recentShares) {
      const key = `${share.embedType}:${share.targetId}`;
      if (!uniqueTargets.has(key)) {
        uniqueTargets.set(key, {
          embedType: share.embedType,
          targetId: share.targetId,
          createdAt: share.createdAt,
        });
      }
    }

    const results: RecentShareableDto[] = [];
    const getMediaUrl = (mediaObj: unknown) => {
      const m = mediaObj as {
        provider: StorageProvider;
        fileId: string;
        mimeType: string;
        version?: string | null;
        format?: string | null;
      };
      return m
        ? this.mediaUrlService.getMediaUrl(m.provider, m.fileId, m.mimeType, m.version, m.format)
        : undefined;
    };

    for (const item of Array.from(uniqueTargets.values())) {
      try {
        if (item.embedType === 'BUSINESS') {
          const biz = await this.prisma.businessProfile.findUnique({
            where: { id: item.targetId },
            include: { media: { where: { role: 'LOGO' } } },
          });
          if (biz) {
            const imageUrl = getMediaUrl(biz.media?.[0]);
            results.push({
              type: 'BUSINESS',
              targetId: biz.id,
              title: biz.name,
              ...(imageUrl ? { imageUrl } : {}),
              lastInteractedAt: item.createdAt,
            });
          }
        } else if (item.embedType === 'LISTING') {
          const listing = await this.prisma.listing.findUnique({
            where: { id: item.targetId },
            include: { media: { where: { role: 'COVER' } } },
          });
          if (listing) {
            const imageUrl = getMediaUrl(listing.media?.[0]);
            results.push({
              type: 'LISTING',
              targetId: listing.id,
              title: listing.title,
              ...(imageUrl ? { imageUrl } : {}),
              lastInteractedAt: item.createdAt,
            });
          }
        } else if (item.embedType === 'TOUR') {
          const tour = await this.prisma.businessTour.findUnique({
            where: { id: item.targetId },
            include: { media: { where: { role: 'GALLERY' } } },
          });
          if (tour) {
            const imageUrl = getMediaUrl(tour.media?.[0]);
            results.push({
              type: 'TOUR',
              targetId: tour.id,
              title: tour.title,
              ...(imageUrl ? { imageUrl } : {}),
              lastInteractedAt: item.createdAt,
            });
          }
        }
      } catch {
        // ignore missing entities
      }

      if (results.length >= 10) break; // Limit to 10 recent
    }

    return results;
  }
}
