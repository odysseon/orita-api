import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { ConversationView, MessageView } from '../../domain/types/messaging.types.js';

export interface ConversationDetails {
  conversation: ConversationView;
  messages: MessageView[];
  viewerParticipantId: string;
}

@Injectable()
export class GetConversationDetailsUseCase {
  constructor(private readonly repo: IConversationRepository) {}

  async execute(conversationId: string, participantIds: string[]): Promise<ConversationDetails> {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found.`);
    }

    const myParticipantId = conversation.participantIds.find((id) => participantIds.includes(id));
    if (!myParticipantId) {
      throw new ForbiddenException('User is not a participant of this conversation.');
    }

    const messages = await this.repo.getMessages(conversationId);
    return { conversation, messages, viewerParticipantId: myParticipantId };
  }
}
