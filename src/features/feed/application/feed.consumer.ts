import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DiscoveryItemType } from '../../../../generated/prisma/client.js';
import type { EnrichedDomainEvent } from '../../../shared/events/event-bus.service.js';
import { NotificationEngine } from './services/notification.engine.js';

@Injectable()
export class FeedConsumer {
  private readonly logger = new Logger(FeedConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationEngine: NotificationEngine,
  ) {}

  @OnEvent('business.created')
  async handleBusinessCreated(payload: EnrichedDomainEvent<{ businessProfileId: string }>) {
    this.logger.log(`Handling business.created for ${payload.data.businessProfileId}`);
    await this.upsertDiscoveryItem(
      DiscoveryItemType.BUSINESS,
      payload.data.businessProfileId,
      payload.data.businessProfileId,
    );
    this.notificationEngine.evaluateAndDispatch(
      DiscoveryItemType.BUSINESS,
      payload.data.businessProfileId,
      payload.data.businessProfileId,
    );
  }

  @OnEvent('listing.published')
  async handleListingPublished(
    payload: EnrichedDomainEvent<{ businessProfileId: string; listingId: string }>,
  ) {
    this.logger.log(`Handling listing.published for ${payload.data.listingId}`);
    await this.upsertDiscoveryItem(
      DiscoveryItemType.LISTING,
      payload.data.businessProfileId,
      payload.data.listingId,
    );
    this.notificationEngine.evaluateAndDispatch(
      DiscoveryItemType.LISTING,
      payload.data.businessProfileId,
      payload.data.listingId,
    );
  }

  @OnEvent('tour.uploaded')
  async handleTourUploaded(
    payload: EnrichedDomainEvent<{ businessProfileId: string; tourId: string }>,
  ) {
    this.logger.log(`Handling tour.uploaded for ${payload.data.tourId}`);
    await this.upsertDiscoveryItem(
      DiscoveryItemType.TOUR,
      payload.data.businessProfileId,
      payload.data.tourId,
    );
  }

  @OnEvent('listing.saved')
  async handleListingSaved(payload: EnrichedDomainEvent<{ listingId: string }>) {
    this.logger.log(`Handling listing.saved for ${payload.data.listingId}`);
    await this.incrementCounter(DiscoveryItemType.LISTING, payload.data.listingId, 'savesCount', 1);
  }

  @OnEvent('listing.unsaved')
  async handleListingUnsaved(payload: EnrichedDomainEvent<{ listingId: string }>) {
    this.logger.log(`Handling listing.unsaved for ${payload.data.listingId}`);
    await this.incrementCounter(
      DiscoveryItemType.LISTING,
      payload.data.listingId,
      'savesCount',
      -1,
    );
  }

  @OnEvent('business.saved')
  async handleBusinessSaved(payload: EnrichedDomainEvent<{ businessProfileId: string }>) {
    this.logger.log(`Handling business.saved for ${payload.data.businessProfileId}`);
    await this.incrementCounter(
      DiscoveryItemType.BUSINESS,
      payload.data.businessProfileId,
      'savesCount',
      1,
    );
  }

  @OnEvent('business.unsaved')
  async handleBusinessUnsaved(payload: EnrichedDomainEvent<{ businessProfileId: string }>) {
    this.logger.log(`Handling business.unsaved for ${payload.data.businessProfileId}`);
    await this.incrementCounter(
      DiscoveryItemType.BUSINESS,
      payload.data.businessProfileId,
      'savesCount',
      -1,
    );
  }

  @OnEvent('message.sent')
  async handleMessageSent(
    payload: EnrichedDomainEvent<{ referenceType: string | null; referenceId: string | null }>,
  ) {
    if (!payload.data.referenceType || !payload.data.referenceId) return;
    this.logger.log(
      `Handling message.sent for ${payload.data.referenceType} ${payload.data.referenceId}`,
    );
    const itemType = payload.data.referenceType as DiscoveryItemType;
    await this.incrementCounter(itemType, payload.data.referenceId, 'messagesCount', 1);
  }

  @OnEvent('unique-content.shared')
  async handleUniqueContentShared(
    payload: EnrichedDomainEvent<{
      senderId: string;
      recipientId: string;
      embedType: string;
      targetId: string;
    }>,
  ) {
    if (!['BUSINESS', 'LISTING', 'TOUR'].includes(payload.data.embedType)) return;
    this.logger.log(
      `Handling unique-content.shared for ${payload.data.embedType} ${payload.data.targetId}`,
    );

    const itemType = payload.data.embedType as DiscoveryItemType;
    await this.incrementCounter(itemType, payload.data.targetId, 'sharesCount', 1);
  }

  @OnEvent('analytics.event.created')
  async handleAnalyticsEvent(
    payload: EnrichedDomainEvent<{
      eventType: string;
      businessProfileId: string;
      listingId?: string | null;
    }>,
  ) {
    this.logger.log(`Handling analytics.event.created ${payload.data.eventType}`);
    if (payload.data.eventType === 'LISTING_VIEW' && payload.data.listingId) {
      await this.incrementCounter(
        DiscoveryItemType.LISTING,
        payload.data.listingId,
        'clicksCount',
        1,
      );
    } else if (payload.data.eventType === 'PROFILE_VIEW') {
      await this.incrementCounter(
        DiscoveryItemType.BUSINESS,
        payload.data.businessProfileId,
        'clicksCount',
        1,
      );
    } else {
      // Other events like PHONE_CLICK or WEBSITE_CLICK can also be considered clicks for the business
      await this.incrementCounter(
        DiscoveryItemType.BUSINESS,
        payload.data.businessProfileId,
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
