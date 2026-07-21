import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';

import { CurrentIdentity, Public } from '@odysseon/whoami-adapter-nestjs';
import type { RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { PrismaService } from '../../../../prisma/prisma.service.js';

import { DeleteMediaUseCase } from '../../application/use-cases/delete-media.use-case.js';
import { ReorderMediaUseCase } from '../../application/use-cases/reorder-media.use-case.js';
import { GetResourceMediaUseCase } from '../../application/use-cases/get-resource-media.use-case.js';
import { MediaOwnerKey } from '../../domain/ports/media.repository.port.js';
import { MediaRole } from '../../domain/types/media-role.enum.js';

import { ModeratorOrAdminGuard } from '../../../../shared/decorators/moderator-or-admin-guard.decorator.js';
import {
  MediaResponseDto,
  ReorderMediaDto,
  UploadIntentRequestDto,
  ConsumeIntentRequestDto,
  UploadIntentResponseDto,
  BusinessProfileMediaDto,
  ListingMediaDto,
  ReviewMediaDto,
  BusinessTourMediaDto,
} from '../dto/media.dto.js';
import { GenerateUploadIntentUseCase } from '../../application/use-cases/generate-upload-intent.use-case.js';
import { ConsumeUploadIntentUseCase } from '../../application/use-cases/consume-upload-intent.use-case.js';
import { ConversationAccessPolicy } from '../../../messaging/application/policies/conversation-access.policy.js';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Media')
@ApiBearerAuth()
@Controller()
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deleteMedia: DeleteMediaUseCase,
    private readonly reorderMedia: ReorderMediaUseCase,
    private readonly getResourceMedia: GetResourceMediaUseCase,
    private readonly generateUploadIntent: GenerateUploadIntentUseCase,
    private readonly consumeUploadIntent: ConsumeUploadIntentUseCase,
    private readonly conversationAccessPolicy: ConversationAccessPolicy,
  ) {}

  // ---------------------------------------------------------------------------
  // Upload Intents (Direct Upload flow)
  // ---------------------------------------------------------------------------

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('listings/:resourceId/media/upload-intent')
  async generateListingIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: UploadIntentRequestDto,
  ): Promise<UploadIntentResponseDto> {
    return this.#handleGenerateIntent(identity, 'listingId', resourceId, dto.role);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('business-profiles/:resourceId/media/upload-intent')
  async generateBusinessProfileIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: UploadIntentRequestDto,
  ): Promise<UploadIntentResponseDto> {
    return this.#handleGenerateIntent(identity, 'businessProfileId', resourceId, dto.role);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('reviews/:resourceId/media/upload-intent')
  async generateReviewIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: UploadIntentRequestDto,
  ): Promise<UploadIntentResponseDto> {
    return this.#handleGenerateIntent(identity, 'reviewId', resourceId, dto.role);
  }

  @ModeratorOrAdminGuard()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('business-tours/:resourceId/media/upload-intent')
  async generateBusinessTourIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: UploadIntentRequestDto,
  ): Promise<UploadIntentResponseDto> {
    return this.#handleGenerateIntent(identity, 'businessTourId', resourceId, dto.role);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('conversations/:resourceId/media/upload-intent')
  async generateConversationIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: UploadIntentRequestDto,
  ): Promise<UploadIntentResponseDto> {
    return this.#handleGenerateIntent(identity, 'conversationId', resourceId, dto.role);
  }

  // ---------------------------------------------------------------------------
  // Persist Direct Uploads
  // ---------------------------------------------------------------------------

  @Post('listings/:resourceId/media')
  async consumeListingIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: ConsumeIntentRequestDto,
  ): Promise<MediaResponseDto> {
    return this.#handleConsumeIntent(identity, 'listingId', resourceId, dto);
  }

  @Post('business-profiles/:resourceId/media')
  async consumeBusinessProfileIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: ConsumeIntentRequestDto,
  ): Promise<MediaResponseDto> {
    return this.#handleConsumeIntent(identity, 'businessProfileId', resourceId, dto);
  }

  @Post('reviews/:resourceId/media')
  async consumeReviewIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: ConsumeIntentRequestDto,
  ): Promise<MediaResponseDto> {
    return this.#handleConsumeIntent(identity, 'reviewId', resourceId, dto);
  }

  @ModeratorOrAdminGuard()
  @Post('business-tours/:resourceId/media')
  async consumeBusinessTourIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: ConsumeIntentRequestDto,
  ): Promise<MediaResponseDto> {
    return this.#handleConsumeIntent(identity, 'businessTourId', resourceId, dto);
  }

  @Post('conversations/:resourceId/media')
  async consumeConversationIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: ConsumeIntentRequestDto,
  ): Promise<MediaResponseDto> {
    return this.#handleConsumeIntent(identity, 'conversationId', resourceId, dto);
  }

  // ---------------------------------------------------------------------------
  // Fetch (grouped by role)
  // ---------------------------------------------------------------------------

  /**
   * GET /listings/:resourceId/media
   * Returns { cover, gallery } — structured for storefront rendering.
   */
  @Public()
  @Get('listings/:resourceId/media')
  async getListingMedia(@Param('resourceId') resourceId: string): Promise<ListingMediaDto> {
    const items = await this.getResourceMedia.execute('listingId', resourceId);
    return ListingMediaDto.from(items);
  }

  /**
   * GET /business-profiles/:resourceId/media
   * Returns { logo, banner, gallery } — structured for storefront rendering.
   */
  @Public()
  @Get('business-profiles/:resourceId/media')
  async getBusinessProfileMedia(
    @Param('resourceId') resourceId: string,
  ): Promise<BusinessProfileMediaDto> {
    const items = await this.getResourceMedia.execute('businessProfileId', resourceId);
    return BusinessProfileMediaDto.from(items);
  }

  /**
   * GET /reviews/:resourceId/media
   * Returns { gallery } — raw user photos, gallery-ordered.
   */
  @Public()
  @Get('reviews/:resourceId/media')
  async getReviewMedia(@Param('resourceId') resourceId: string): Promise<ReviewMediaDto> {
    const items = await this.getResourceMedia.execute('reviewId', resourceId);
    return ReviewMediaDto.from(items);
  }

  /**
   * GET /business-tours/:resourceId/media
   * Returns { gallery } — raw user photos, gallery-ordered.
   */
  @Public()
  @Get('business-tours/:resourceId/media')
  async getBusinessTourMedia(
    @Param('resourceId') resourceId: string,
  ): Promise<BusinessTourMediaDto> {
    const items = await this.getResourceMedia.execute('businessTourId', resourceId);
    return BusinessTourMediaDto.from(items);
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  /** DELETE /media/:id */
  @HttpCode(204)
  @Delete('media/:id')
  async delete(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
  ): Promise<void> {
    await this.#assertMediaOwnership(id, identity.accountId);
    await this.deleteMedia.execute(id);
  }

  // ---------------------------------------------------------------------------
  // Reorder (GALLERY only)
  // ---------------------------------------------------------------------------

  /**
   * PATCH /listings/:resourceId/media/reorder
   * orderedIds must include all GALLERY item IDs only — not COVER.
   */
  @Patch('listings/:resourceId/media/reorder')
  async reorderListingMedia(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: ReorderMediaDto,
  ): Promise<MediaResponseDto[]> {
    await this.#assertResourceOwnership('listingId', resourceId, identity.accountId);
    const items = await this.reorderMedia.execute('listingId', resourceId, dto.orderedIds);
    return items.map((m) => MediaResponseDto.from(m));
  }

  /**
   * PATCH /business-profiles/:resourceId/media/reorder
   * orderedIds must include all GALLERY item IDs only — not LOGO or BANNER.
   */
  @Patch('business-profiles/:resourceId/media/reorder')
  async reorderBusinessProfileMedia(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: ReorderMediaDto,
  ): Promise<MediaResponseDto[]> {
    await this.#assertResourceOwnership('businessProfileId', resourceId, identity.accountId);
    const items = await this.reorderMedia.execute('businessProfileId', resourceId, dto.orderedIds);
    return items.map((m) => MediaResponseDto.from(m));
  }

  /**
   * PATCH /reviews/:resourceId/media/reorder
   * orderedIds must include all GALLERY item IDs for this review.
   * Only the reviewer may reorder their own review media.
   */
  @Patch('reviews/:resourceId/media/reorder')
  async reorderReviewMedia(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: ReorderMediaDto,
  ): Promise<MediaResponseDto[]> {
    await this.#assertResourceOwnership('reviewId', resourceId, identity.accountId);
    const items = await this.reorderMedia.execute('reviewId', resourceId, dto.orderedIds);
    return items.map((m) => MediaResponseDto.from(m));
  }

  /**
   * PATCH /business-tours/:resourceId/media/reorder
   * orderedIds must include all GALLERY item IDs for this store tour.
   * Only the creator may reorder their own store tour media.
   */
  @Patch('business-tours/:resourceId/media/reorder')
  @ModeratorOrAdminGuard()
  async reorderBusinessTourMedia(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('resourceId') resourceId: string,
    @Body() dto: ReorderMediaDto,
  ): Promise<MediaResponseDto[]> {
    await this.#assertResourceOwnership('businessTourId', resourceId, identity.accountId);
    const items = await this.reorderMedia.execute('businessTourId', resourceId, dto.orderedIds);
    return items.map((m) => MediaResponseDto.from(m));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  async #handleGenerateIntent(
    identity: RequestIdentity,
    ownerKey: MediaOwnerKey,
    resourceId: string,
    role: MediaRole,
  ): Promise<UploadIntentResponseDto> {
    await this.#assertResourceOwnership(ownerKey, resourceId, identity.accountId);
    const userId = await this.#resolveUserId(identity.accountId);

    return this.generateUploadIntent.execute({
      ownerKey,
      ownerId: resourceId,
      role,
      createdById: userId,
    });
  }

  async #handleConsumeIntent(
    identity: RequestIdentity,
    ownerKey: MediaOwnerKey,
    resourceId: string,
    dto: ConsumeIntentRequestDto,
  ): Promise<MediaResponseDto> {
    // Assert resource ownership again at persistence time for safety
    await this.#assertResourceOwnership(ownerKey, resourceId, identity.accountId);
    const userId = await this.#resolveUserId(identity.accountId);

    const media = await this.consumeUploadIntent.execute({
      intentId: dto.intentId,
      publicId: dto.publicId,
      version: dto.version,
      ownerKey,
      ownerId: resourceId,
      requesterId: userId,
    });

    return MediaResponseDto.from(media);
  }

  async #assertResourceOwnership(
    ownerKey: MediaOwnerKey,
    resourceId: string,
    accountId: string,
  ): Promise<void> {
    const userId = await this.#resolveUserId(accountId);

    if (ownerKey === 'listingId') {
      const listing = await this.prisma.listing.findUnique({
        where: { id: resourceId },
        select: { businessProfile: { select: { ownerId: true } } },
      });
      if (!listing) throw new NotFoundException('Listing not found.');
      if (listing.businessProfile.ownerId !== userId) {
        throw new ForbiddenException('You do not own this listing.');
      }
    }

    if (ownerKey === 'businessProfileId') {
      const profile = await this.prisma.businessProfile.findUnique({
        where: { id: resourceId },
        select: { ownerId: true },
      });
      if (!profile) throw new NotFoundException('Business profile not found.');
      if (profile.ownerId !== userId) {
        throw new ForbiddenException('You do not own this business profile.');
      }
    }

    if (ownerKey === 'reviewId') {
      const review = await this.prisma.review.findUnique({
        where: { id: resourceId },
        select: { reviewerId: true },
      });
      if (!review) throw new NotFoundException('Review not found.');
      if (review.reviewerId !== userId) {
        throw new ForbiddenException('You can only manage media on your own reviews.');
      }
    }

    if (ownerKey === 'businessTourId') {
      const tour = await this.prisma.businessTour.findUnique({
        where: { id: resourceId },
        select: { createdById: true },
      });
      if (!tour) throw new NotFoundException('Store tour not found.');
      if (tour.createdById !== userId) {
        throw new ForbiddenException('You can only manage media on your own store tours.');
      }
    }

    if (ownerKey === 'conversationId') {
      await this.conversationAccessPolicy.resolve(userId, resourceId);
    }
  }

  async #assertMediaOwnership(id: string, accountId: string): Promise<void> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media item not found.');
    let ownerKey: MediaOwnerKey | null = null;
    let resourceId = '';

    if (media.businessProfileId) {
      ownerKey = 'businessProfileId';
      resourceId = media.businessProfileId;
    } else if (media.listingId) {
      ownerKey = 'listingId';
      resourceId = media.listingId;
    } else if (media.businessTourId) {
      ownerKey = 'businessTourId';
      resourceId = media.businessTourId;
    } else if (media.reviewId) {
      ownerKey = 'reviewId';
      resourceId = media.reviewId;
    } else if (media.messageId) {
      // For message media, we check ownership through the message's participant
      ownerKey = 'messageId';
      resourceId = media.messageId;
    }

    if (!ownerKey) {
      throw new BadRequestException('Media is orphaned');
    }

    if (ownerKey === 'messageId') {
      const message = await this.prisma.message.findUnique({
        where: { id: resourceId },
        select: { participant: { select: { userId: true } } },
      });
      if (!message) throw new NotFoundException('Message not found.');
      const userId = await this.#resolveUserId(accountId);
      if (message.participant.userId !== userId) {
        throw new ForbiddenException('You can only manage your own message media.');
      }
    } else {
      await this.#assertResourceOwnership(ownerKey, resourceId, accountId);
    }
  }

  async #resolveUserId(accountId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    return user.id;
  }
}
