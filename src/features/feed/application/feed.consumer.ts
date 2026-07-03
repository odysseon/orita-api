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
