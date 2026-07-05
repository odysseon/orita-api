import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BaseNotificationPolicy, NotificationUrgency, NotificationPayload } from './base.policy.js';
import { NearbyAudienceResolver } from '../resolvers/nearby-audience.resolver.js';
import { NotificationEngine } from '../engine/notification.engine.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { EnrichedDomainEvent } from '../../../../shared/events/event-bus.service.js';

import { ListingCreatedEvent } from '../../../../shared/events/listing.events.js';

type EventType = EnrichedDomainEvent<ListingCreatedEvent>;

@Injectable()
export class ListingPublishedPolicy extends BaseNotificationPolicy<EventType> {
  constructor(
    private readonly engine: NotificationEngine,
    private readonly nearbyResolver: NearbyAudienceResolver,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  /**
   * Explicitly subscribe to the listing.published event.
   */
  @OnEvent('listing.published', { async: true })
  async handle(event: EventType) {
    await this.engine.process(this, event);
  }

  isEligible(): boolean {
    return true;
  }

  async resolveAudience(event: EventType): Promise<string[]> {
    const listingId = event.data.listingId;

    // We need the locationId of the business that owns this listing
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { businessProfile: { select: { locationId: true } } },
    });

    if (!listing || !listing.businessProfile || !listing.businessProfile.locationId) {
      return [];
    }

    // Resolve audience within 15km
    return this.nearbyResolver.resolve(listing.businessProfile.locationId, 15);
  }

  getUrgency(): NotificationUrgency {
    return NotificationUrgency.NORMAL;
  }

  getPreferenceCategory(): string {
    return 'nearbyDiscoveries';
  }

  getPayload(event: EventType): NotificationPayload {
    return {
      type: 'NEW_LISTING',
      ...(event.data.actorId ? { actorId: event.data.actorId } : {}),
      referenceType: 'LISTING',
      referenceId: event.data.listingSlug,
      payload: {
        businessName: event.data.businessName,
        listingTitle: event.data.listingTitle,
      },
    };
  }
}
