import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PostHog } from 'posthog-node';
import { BusinessProfileCreatedEvent } from '../../../../shared/events/business-profile.events.js';
import {
  ListingCreatedEvent,
  ListingStatusChangedEvent,
} from '../../../../shared/events/listing.events.js';

@Injectable()
export class AnalyticsListener {
  private readonly logger = new Logger(AnalyticsListener.name);
  private client: PostHog | null = null;

  constructor() {
    const apiKey = process.env['POSTHOG_API_KEY'] || 'phc_PLACEHOLDER';
    if (apiKey && apiKey !== 'phc_PLACEHOLDER') {
      this.client = new PostHog(apiKey, { host: 'https://us.i.posthog.com' });
    } else {
      this.logger.warn('POSTHOG_API_KEY is not set. Analytics events will not be forwarded.');
    }
  }

  @OnEvent(BusinessProfileCreatedEvent.name)
  handleBusinessProfileCreated(event: BusinessProfileCreatedEvent) {
    if (!this.client) return;
    this.client.capture({
      distinctId: event.ownerId,
      event: 'business.created',
      properties: {
        businessId: event.businessProfileId,
      },
    });
  }

  @OnEvent(ListingCreatedEvent.name)
  handleListingCreated(event: ListingCreatedEvent) {
    if (!this.client) return;
    this.client.capture({
      distinctId: event.actorId || event.businessProfileId,
      event: 'listing.created',
      properties: {
        listingId: event.listingId,
        businessId: event.businessProfileId,
      },
    });
  }

  @OnEvent(ListingStatusChangedEvent.name)
  handleListingStatusChanged(event: ListingStatusChangedEvent) {
    if (!this.client) return;
    if (event.newStatus === 'PUBLISHED') {
      this.client.capture({
        distinctId: event.businessProfileId,
        event: 'listing.published',
        properties: {
          listingId: event.listingId,
          businessId: event.businessProfileId,
        },
      });
    }
  }
}
