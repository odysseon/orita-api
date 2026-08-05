import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BaseNotificationPolicy, NotificationUrgency, NotificationPayload } from './base.policy.js';
import { NearbyAudienceResolver } from '../resolvers/nearby-audience.resolver.js';
import { NotificationEngine } from '../engine/notification.engine.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { EnrichedDomainEvent } from '../../../../shared/events/event-bus.service.js';

import { ListingStatusChangedEvent } from '../../../../shared/events/listing.events.js';
import { ListingStatus } from '../../../listing/domain/types/listing-status.enum.js';

type EventType = EnrichedDomainEvent<ListingStatusChangedEvent>;

@Injectable()
export class ListingPublishedPolicy extends BaseNotificationPolicy<EventType> {
  constructor(
    private readonly engine: NotificationEngine,
    private readonly nearbyResolver: NearbyAudienceResolver,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  @OnEvent('listing.status.changed', { async: true })
  async handle(event: EventType) {
    if (
      event.data.newStatus === ListingStatus.PUBLISHED &&
      event.data.oldStatus !== ListingStatus.PUBLISHED
    ) {
      await this.engine.process(this, event);
    }
  }

  isEligible(): boolean {
    return true;
  }

  async resolveAudience(event: EventType): Promise<string[]> {
    const listingId = event.data.listingId;

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { businessProfile: { include: { locations: { where: { isPrimary: true } } } } },
    });

    if (
      !listing ||
      !listing.businessProfile ||
      !listing.businessProfile.locations?.[0]?.locationId
    ) {
      return [];
    }

    return this.nearbyResolver.resolve(listing.businessProfile.locations[0].locationId, 15);
  }

  getUrgency(): NotificationUrgency {
    return NotificationUrgency.NORMAL;
  }

  getPreferenceCategory(): string {
    return 'nearbyDiscoveries';
  }

  async getPayload(event: EventType): Promise<NotificationPayload> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: event.data.listingId },
      include: { businessProfile: { select: { name: true } } },
    });

    return {
      type: 'NEW_LISTING',
      referenceType: 'LISTING',
      referenceId: listing?.slug || event.data.listingId,
      payload: {
        businessName: listing?.businessProfile?.name || 'A business',
        listingTitle: listing?.title || 'A listing',
      },
    };
  }
}
