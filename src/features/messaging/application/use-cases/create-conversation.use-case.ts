import { Injectable, BadRequestException } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { CreateConversationInput, ConversationView } from '../../domain/types/messaging.types.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import { AnchorService } from '../services/anchor.service.js';

@Injectable()
export class CreateConversationUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly eventBus: EventBusService,
    private readonly anchorService: AnchorService,
  ) {}

  async execute(input: CreateConversationInput): Promise<ConversationView> {
    if (input.type === 'DIRECT' && input.invitedParticipantIds.length !== 1) {
      throw new BadRequestException(
        'Direct conversations must have exactly one invited participant',
      );
    }

    let anchor = undefined;
    if (input.anchor) {
      anchor = await this.anchorService.createAnchor(input.anchor);
    }

    const conversation = await this.repo.create(input, anchor);

    if (input.initialMessage) {
      await this.eventBus.publish('message.sent', {
        senderId: input.participantId, // We use participantId as senderId for legacy compat if needed
        conversationId: conversation.id,
      });
    }

    return conversation;
  }
}
