import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BaseNotificationPolicy, NotificationUrgency, NotificationPayload } from './base.policy.js';
import { NotificationEngine } from '../engine/notification.engine.js';
import { EnrichedDomainEvent } from '../../../../shared/events/event-bus.service.js';
import { MessagePreviewDescriptor } from '../../../messaging/domain/types/messaging.types.js';

export interface MessageSentEvent {
  messageId: string;
  conversationId: string;
  senderUserId: string | null;
  senderDisplayName: string;
  recipientUserIds: string[];
  preview: MessagePreviewDescriptor;
  sentAt: Date;
}

type EventType = EnrichedDomainEvent<MessageSentEvent>;

@Injectable()
export class MessageReceivedPolicy extends BaseNotificationPolicy<EventType> {
  constructor(private readonly engine: NotificationEngine) {
    super();
  }

  @OnEvent('message.sent', { async: true })
  async handle(event: EventType) {
    await this.engine.process(this, event);
  }

  isEligible(): boolean {
    return true;
  }

  resolveAudience(event: EventType): Promise<string[]> {
    return Promise.resolve(event.data.recipientUserIds);
  }

  getUrgency(): NotificationUrgency {
    return NotificationUrgency.NORMAL;
  }

  getPreferenceCategory(): string {
    return 'messages';
  }

  getPayload(event: EventType): NotificationPayload {
    const payload: NotificationPayload = {
      type: 'MESSAGE_RECEIVED',
      referenceType: 'CONVERSATION',
      referenceId: event.data.conversationId,
      payload: {
        senderDisplayName: event.data.senderDisplayName,
        preview: event.data.preview,
      },
    };

    if (event.data.senderUserId) {
      payload.actorId = event.data.senderUserId;
    }

    return payload;
  }
}
