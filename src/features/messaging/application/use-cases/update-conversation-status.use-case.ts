import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { ConversationStatus, ConversationView } from '../../domain/types/messaging.types.js';

@Injectable()
export class UpdateConversationStatusUseCase {
  constructor(private readonly repo: IConversationRepository) {}

  async execute(conversationId: string, participantId: string, status: ConversationStatus): Promise<ConversationView> {
    const exists = await this.repo.findById(conversationId);
    if (!exists) {
      throw new NotFoundException(`Conversation ${conversationId} not found.`);
    }

    const isParticipant = await this.repo.isParticipant(conversationId, participantId);
    if (!isParticipant) {
      throw new ForbiddenException('User is not a participant of this conversation.');
    }
    return this.repo.updateStatus(conversationId, status);
  }
}
