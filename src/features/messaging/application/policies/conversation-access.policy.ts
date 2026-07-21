import { Injectable, NotFoundException } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { ParticipantService } from '../services/participant.service.js';
import { ConversationParticipantResolver } from '../services/conversation-participant-resolver.service.js';
import { ConversationView } from '../../domain/types/messaging.types.js';

export interface ConversationAccessContext {
  conversation: ConversationView;
  participantId: string;
}

@Injectable()
export class ConversationAccessPolicy {
  constructor(
    private readonly conversationRepo: IConversationRepository,
    private readonly participantService: ParticipantService,
    private readonly participantResolver: ConversationParticipantResolver,
  ) {}

  /**
   * Resolves access context for a user in a specific conversation.
   * Ensures the conversation exists and the user is an active participant.
   * Throws NotFoundException or ForbiddenException if access is denied.
   */
  async resolve(userId: string, conversationId: string): Promise<ConversationAccessContext> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const participants = await this.participantService.getMyParticipants(userId);
    const myParticipantIds = participants.map((p) => p.id);

    const activeParticipantId = this.participantResolver.resolve(conversation, myParticipantIds);

    return {
      conversation,
      participantId: activeParticipantId,
    };
  }
}
