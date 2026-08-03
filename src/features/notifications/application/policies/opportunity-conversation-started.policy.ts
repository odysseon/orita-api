import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BaseNotificationPolicy, NotificationUrgency, NotificationPayload } from './base.policy.js';
import { NotificationEngine } from '../engine/notification.engine.js';
import { EnrichedDomainEvent } from '../../../../shared/events/event-bus.service.js';
import { OpportunityConversationStartedEvent } from '../../../../shared/events/opportunity.events.js';

type EventType = EnrichedDomainEvent<OpportunityConversationStartedEvent>;

@Injectable()
export class OpportunityConversationStartedPolicy extends BaseNotificationPolicy<EventType> {
  constructor(private readonly engine: NotificationEngine) {
    super();
  }

  @OnEvent('opportunity.conversation.started', { async: true })
  async handle(event: EventType) {
    await this.engine.process(this, event);
  }

  isEligible(): boolean {
    return true;
  }

  resolveAudience(event: EventType): Promise<string[]> {
    return Promise.resolve([event.data.authorUserId]);
  }

  getUrgency(): NotificationUrgency {
    return NotificationUrgency.NORMAL;
  }

  getPreferenceCategory(): string {
    return 'messages';
  }

  getPayload(event: EventType): NotificationPayload {
    return {
      type: 'OPPORTUNITY_CONVERSATION_STARTED',
      actorId: event.data.initiatorUserId,
      referenceType: 'CONVERSATION',
      referenceId: event.data.conversationId,
      payload: {
        opportunityId: event.data.opportunityId,
      },
    };
  }
}
