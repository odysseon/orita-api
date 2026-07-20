import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BaseNotificationPolicy, NotificationUrgency, NotificationPayload } from './base.policy.js';
import { NotificationEngine } from '../engine/notification.engine.js';
import { EnrichedDomainEvent } from '../../../../shared/events/event-bus.service.js';
import { BusinessProfilePublishedEvent } from '../../../../shared/events/business-profile.events.js';

type EventType = EnrichedDomainEvent<BusinessProfilePublishedEvent>;

@Injectable()
export class BusinessPublishedOwnerPolicy extends BaseNotificationPolicy<EventType> {
  constructor(private readonly engine: NotificationEngine) {
    super();
  }

  @OnEvent('business.published', { async: true })
  async handle(event: EventType) {
    await this.engine.process(this, event);
  }

  isEligible(): boolean {
    return true;
  }

  resolveAudience(event: EventType): Promise<string[]> {
    if (!event.data.ownerId) {
      return Promise.resolve([]);
    }
    return Promise.resolve([event.data.ownerId]);
  }

  getUrgency(): NotificationUrgency {
    return NotificationUrgency.NORMAL;
  }

  getPreferenceCategory(): string {
    return 'account';
  }

  getPayload(event: EventType): NotificationPayload {
    return {
      type: 'BUSINESS_PUBLISHED_OWNER',
      referenceType: 'BUSINESS',
      referenceId: event.data.businessSlug,
      payload: {
        title: 'Your business is now live',
        body: `Your business "${event.data.businessName}" is now discoverable on Orita.`,
        ctaText: 'View business',
        ctaUrl: `/businesses/${event.data.businessSlug}`,
      },
    };
  }
}
