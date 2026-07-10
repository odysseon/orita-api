import { Injectable, ForbiddenException } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { MarkMessagesReadInput } from '../../domain/types/messaging.types.js';

@Injectable()
export class MarkMessagesReadUseCase {
  constructor(private readonly repo: IConversationRepository) {}

  async execute(input: MarkMessagesReadInput): Promise<void> {
    const allowed = await this.repo.isParticipant(input.conversationId, input.participantId);
    if (!allowed) {
      throw new ForbiddenException('You are not a participant of this conversation.');
    }

    await this.repo.markRead(input);
  }
}
