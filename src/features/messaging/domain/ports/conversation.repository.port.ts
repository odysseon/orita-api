import {
  ConversationView,
  MessageView,
  CreateConversationInput,
  SendMessageInput,
  MarkMessagesReadInput,
  ConversationStatus,
} from '../types/messaging.types.js';
import type { ConversationAnchor } from '../../../../../generated/prisma/client.js';

export abstract class IConversationRepository {
  abstract create(
    input: CreateConversationInput,
    anchor?: ConversationAnchor,
  ): Promise<ConversationView>;
  abstract addMessage(
    input: SendMessageInput,
    senderDisplayName: string,
    senderAvatarUrl: string | null,
  ): Promise<MessageView>;
  abstract findById(id: string): Promise<ConversationView | null>;
  abstract findByParticipantIds(participantIds: string[]): Promise<ConversationView[]>;
  abstract getMessages(conversationId: string): Promise<MessageView[]>;
  abstract updateStatus(id: string, status: ConversationStatus): Promise<ConversationView>;
  abstract markRead(input: MarkMessagesReadInput): Promise<void>;
  abstract isParticipant(conversationId: string, participantId: string): Promise<boolean>;
  abstract addParticipants(conversationId: string, participantIds: string[]): Promise<void>;
}
