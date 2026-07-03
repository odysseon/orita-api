import { Injectable, ForbiddenException } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { SendMessageInput, MessageView } from '../../domain/types/messaging.types.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';

@Injectable()
export class SendMessageUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: SendMessageInput): Promise<MessageView> {
    const allowed = await this.repo.isParticipant(input.conversationId, input.senderId);
    if (!allowed) {
      throw new ForbiddenException('You are not a participant of this conversation.');
    }

    const message = await this.repo.addMessage(input);

    // We only need the reference type and id to track the signal on the discovery item
    await this.eventBus.publish('message.sent', {
      senderId: message.senderId,
      conversationId: message.conversationId,
      referenceType: message.referenceType ?? null,
      referenceId: message.referenceId ?? null,
    });

    return message;
  }
}
