import { Injectable, NotFoundException } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { ConversationStatus, ConversationView } from '../../domain/types/messaging.types.js';
import { ConversationParticipantResolver } from '../services/conversation-participant-resolver.service.js';

@Injectable()
export class UpdateConversationStatusUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly resolver: ConversationParticipantResolver,
  ) {}

  async execute(
    conversationId: string,
    participantIds: string[],
    status: ConversationStatus,
  ): Promise<ConversationView> {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found.`);
    }

    this.resolver.resolve(conversation, participantIds);
    return this.repo.updateStatus(conversationId, status);
  }
}
