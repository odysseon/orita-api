import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DiscoveryItemType } from '../../../../generated/prisma/client.js';

@Injectable()
export class FeedConsumer {
  private readonly logger = new Logger(FeedConsumer.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('business.created')
  async handleBusinessCreated(payload: { businessProfileId: string }) {
    this.logger.log(`Handling business.created for ${payload.businessProfileId}`);
    await this.upsertDiscoveryItem(
      DiscoveryItemType.BUSINESS,
      payload.businessProfileId,
      payload.businessProfileId,
    );
  }

  @OnEvent('listing.published')
  async handleListingPublished(payload: { businessProfileId: string; listingId: string }) {
    this.logger.log(`Handling listing.published for ${payload.listingId}`);
    await this.upsertDiscoveryItem(
      DiscoveryItemType.LISTING,
      payload.businessProfileId,
      payload.listingId,
    );
  }

  @OnEvent('tour.uploaded')
  async handleTourUploaded(payload: { businessProfileId: string; tourId: string }) {
    this.logger.log(`Handling tour.uploaded for ${payload.tourId}`);
    await this.upsertDiscoveryItem(
      DiscoveryItemType.TOUR,
      payload.businessProfileId,
      payload.tourId,
    );
  }

  @OnEvent('listing.saved')
  async handleListingSaved(payload: { listingId: string }) {
    this.logger.log(`Handling listing.saved for ${payload.listingId}`);
    await this.incrementCounter(DiscoveryItemType.LISTING, payload.listingId, 'savesCount', 1);
  }

  @OnEvent('listing.unsaved')
  async handleListingUnsaved(payload: { listingId: string }) {
    this.logger.log(`Handling listing.unsaved for ${payload.listingId}`);
    await this.incrementCounter(DiscoveryItemType.LISTING, payload.listingId, 'savesCount', -1);
  }

  @OnEvent('business.saved')
  async handleBusinessSaved(payload: { businessProfileId: string }) {
    this.logger.log(`Handling business.saved for ${payload.businessProfileId}`);
    await this.incrementCounter(
      DiscoveryItemType.BUSINESS,
      payload.businessProfileId,
      'savesCount',
      1,
    );
  }

  @OnEvent('business.unsaved')
  async handleBusinessUnsaved(payload: { businessProfileId: string }) {
    this.logger.log(`Handling business.unsaved for ${payload.businessProfileId}`);
    await this.incrementCounter(
      DiscoveryItemType.BUSINESS,
      payload.businessProfileId,
      'savesCount',
      -1,
    );
  }

  @OnEvent('message.sent')
  async handleMessageSent(payload: { referenceType: string | null; referenceId: string | null }) {
    if (!payload.referenceType || !payload.referenceId) return;
    this.logger.log(`Handling message.sent for ${payload.referenceType} ${payload.referenceId}`);
    const itemType = payload.referenceType as DiscoveryItemType;
    await this.incrementCounter(itemType, payload.referenceId, 'messagesCount', 1);
  }

  @OnEvent('analytics.event.created')
  async handleAnalyticsEvent(payload: {
    eventType: string;
    businessProfileId: string;
    listingId?: string | null;
  }) {
    this.logger.log(`Handling analytics.event.created ${payload.eventType}`);
    if (payload.eventType === 'LISTING_VIEW' && payload.listingId) {
      await this.incrementCounter(DiscoveryItemType.LISTING, payload.listingId, 'clicksCount', 1);
    } else if (payload.eventType === 'PROFILE_VIEW') {
      await this.incrementCounter(
        DiscoveryItemType.BUSINESS,
        payload.businessProfileId,
        'clicksCount',
        1,
      );
    } else {
      // Other events like PHONE_CLICK or WEBSITE_CLICK can also be considered clicks for the business
      await this.incrementCounter(
        DiscoveryItemType.BUSINESS,
        payload.businessProfileId,
        'clicksCount',
        1,
      );
    }
  }

  private async incrementCounter(
    itemType: DiscoveryItemType,
    referenceId: string,
    field:
      | 'clicksCount'
      | 'savesCount'
      | 'messagesCount'
      | 'sharesCount'
      | 'hidesCount'
      | 'reportsCount',
    amount: number,
  ) {
    try {
      await this.prisma.$executeRawUnsafe(
        `
        UPDATE "discovery_items"
        SET "${field}" = GREATEST(0, "${field}" + $1)
        WHERE "itemType" = $2 AND "referenceId" = $3
      `,
        amount,
        itemType,
        referenceId,
      );
    } catch (error) {
      this.logger.error(`Failed to update ${field} for ${itemType} ${referenceId}`, error);
    }
  }

  private async upsertDiscoveryItem(
    itemType: DiscoveryItemType,
    businessProfileId: string,
    referenceId: string,
  ) {
    try {
      await this.prisma.discoveryItem.upsert({
        where: {
          itemType_referenceId: { itemType, referenceId },
        },
        create: {
          itemType,
          businessProfileId,
          referenceId,
        },
        update: {
          updatedAt: new Date(),
        },
      });
      this.logger.debug(`Upserted DiscoveryItem: ${itemType} / ${referenceId}`);
    } catch (error) {
      this.logger.error(`Failed to upsert DiscoveryItem`, error);
    }
  }
}
