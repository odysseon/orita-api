export type ConversationType = 'DIRECT' | 'GROUP';
export type ConversationStatus = 'ACTIVE' | 'CLOSED';
export type ConversationParticipantRole = 'OWNER' | 'MEMBER';
export type MessageMediaType = 'IMAGE' | 'VIDEO';

export interface ParticipantView {
  id: string;
  userId: string | null;
  businessProfileId: string | null;
  // Resolved display info
  displayName: string;
  avatarUrl: string | null;
}

export interface ConversationAnchorView {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  // Optional live entity references
  businessId: string | null;
  listingId: string | null;
  tourId: string | null;
  locationId: string | null;
}

export interface ConversationView {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  title: string | null;
  anchorId: string | null;
  anchor?: ConversationAnchorView | null;
  participantIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageEmbedView {
  id: string;
  embedType: string;
  targetId: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaPath: string | null;
}

export interface MessageView {
  id: string;
  conversationId: string;
  participantId: string;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  content: string | null;
  mediaUrl: string | null;
  mediaType: MessageMediaType | null;
  embeds: MessageEmbedView[];
  readReceipts: MessageReadReceiptView[];
  createdAt: Date;
}

export interface MessageReadReceiptView {
  messageId: string;
  participantId: string;
  readAt: Date;
}

export interface CreateConversationInput {
  type: ConversationType;
  participantId: string;
  invitedParticipantIds: string[];
  anchor?: {
    type: string;
    targetId: string;
  };
  initialMessage?: string;
}

export interface SendMessageInput {
  conversationId: string;
  participantId: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: MessageMediaType;
  embeds?: {
    embedType: string;
    targetId: string;
  }[];
}

export interface MarkMessagesReadInput {
  conversationId: string;
  messageIds: string[];
  participantId: string;
}
