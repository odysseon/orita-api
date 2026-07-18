import { MessageEmbedType } from '../../../../../generated/prisma/client.js';

export interface InternalShareInput {
  senderId: string;
  recipientIds: string[]; // multi-recipient from day 1
  embedType: MessageEmbedType;
  targetId: string;
  content?: string;
}

export interface ShareResult {
  recipientId: string;
  conversationId: string;
  messageId: string;
}

export interface ShareableSearchResult {
  type: 'BUSINESS' | 'LISTING' | 'TOUR';
  targetId: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

export interface RecentShareable {
  type: 'BUSINESS' | 'LISTING' | 'TOUR';
  targetId: string;
  title: string;
  imageUrl?: string;
  lastInteractedAt: Date; // viewed or shared
}

export interface SuggestedShareRecipient {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  // rank reason is internal — UI only receives the ordered list
}
