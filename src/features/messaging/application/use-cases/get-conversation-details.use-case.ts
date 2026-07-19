import { Injectable, NotFoundException } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { ConversationView, MessageView } from '../../domain/types/messaging.types.js';
import { ConversationParticipantResolver } from '../services/conversation-participant-resolver.service.js';

export interface ConversationDetails {
  conversation: ConversationView;
  messages: MessageView[];
  viewerParticipantId: string;
}

@Injectable()
export class GetConversationDetailsUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly resolver: ConversationParticipantResolver,
  ) {}

  async execute(conversationId: string, participantIds: string[]): Promise<ConversationDetails> {
    const conversation = await this.repo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found.`);
    }

    const myParticipantId = this.resolver.resolve(conversation, participantIds);

    const messages = await this.repo.getMessages(conversationId);
    return { conversation, messages, viewerParticipantId: myParticipantId };
  }
}
