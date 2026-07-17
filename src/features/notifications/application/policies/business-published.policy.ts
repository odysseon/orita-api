import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BaseNotificationPolicy, NotificationUrgency, NotificationPayload } from './base.policy.js';
import { NearbyAudienceResolver } from '../resolvers/nearby-audience.resolver.js';
import { NotificationEngine } from '../engine/notification.engine.js';
import { EnrichedDomainEvent } from '../../../../shared/events/event-bus.service.js';

import { BusinessProfilePublishedEvent } from '../../../../shared/events/business-profile.events.js';

type EventType = EnrichedDomainEvent<BusinessProfilePublishedEvent>;

@Injectable()
export class BusinessPublishedPolicy extends BaseNotificationPolicy<EventType> {
  constructor(
    private readonly engine: NotificationEngine,
    private readonly nearbyResolver: NearbyAudienceResolver,
  ) {
    super();
  }

  @OnEvent('business.published', { async: true })
  async handle(event: EventType) {
    await this.engine.process(this, event);
  }

  isEligible(): boolean {
    return true;
  }

  async resolveAudience(event: EventType): Promise<string[]> {
    if (!event.data.locationId) {
      return [];
    }
    // Resolve audience within 15km
    return this.nearbyResolver.resolve(event.data.locationId, 15);
  }

  getUrgency(): NotificationUrgency {
    return NotificationUrgency.NORMAL;
  }

  getPreferenceCategory(): string {
    return 'nearbyDiscoveries';
  }

  getPayload(event: EventType): NotificationPayload {
    return {
      type: 'NEW_BUSINESS',
      referenceType: 'BUSINESS',
      referenceId: event.data.businessSlug,
      payload: {
        businessName: event.data.businessName,
      },
    };
  }
}
