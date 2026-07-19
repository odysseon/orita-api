import { Injectable } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { MarkMessagesReadInput } from '../../domain/types/messaging.types.js';
import { ConversationParticipantResolver } from '../services/conversation-participant-resolver.service.js';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class MarkMessagesReadUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly resolver: ConversationParticipantResolver,
  ) {}

  async execute(
    input: Omit<MarkMessagesReadInput, 'participantId'>,
    requesterParticipantIds: string[],
  ): Promise<void> {
    const conversation = await this.repo.findById(input.conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${input.conversationId} not found.`);
    }

    const participantId = this.resolver.resolve(conversation, requesterParticipantIds);

    await this.repo.markRead({ ...input, participantId });
  }
}
