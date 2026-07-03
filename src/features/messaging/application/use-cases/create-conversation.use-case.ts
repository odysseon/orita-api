import { Injectable } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { CreateConversationInput, ConversationView } from '../../domain/types/messaging.types.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';

@Injectable()
export class CreateConversationUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: CreateConversationInput): Promise<ConversationView> {
    const conversation = await this.repo.create(input);

    await this.eventBus.publish('message.sent', {
      senderId: input.userId,
      conversationId: conversation.id,
      referenceType: input.listingId ? 'LISTING' : 'BUSINESS',
      referenceId: input.listingId ?? input.businessProfileId,
    });

    return conversation;
  }
}
