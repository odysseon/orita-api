import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';

// Client → Server

export class WsSendMessagePayload {
  @IsString() @IsNotEmpty() conversationId!: string;
  @IsString() @IsNotEmpty() content!: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsEnum(['IMAGE', 'VIDEO']) mediaType?: 'IMAGE' | 'VIDEO';
  @IsOptional() @IsEnum(['BUSINESS', 'LISTING', 'TOUR']) referenceType?:
    'BUSINESS' | 'LISTING' | 'TOUR';
  @IsOptional() @IsString() referenceId?: string;
}

export class WsJoinConversationPayload {
  @IsString() @IsNotEmpty() conversationId!: string;
}

export class WsMarkReadPayload {
  @IsString() @IsNotEmpty() conversationId!: string;
  @IsArray() @IsString({ each: true }) messageIds!: string[];
}

// Server → Client events (documentation only — emitted as plain objects)

export interface WsMessageNewEvent {
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    mediaUrl: string | null;
    mediaType: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    referencePreview?: any;
    createdAt: Date;
    readReceipts: { messageId: string; userId: string; readAt: Date }[];
  };
}

export interface WsReadReceiptEvent {
  conversationId: string;
  messageId: string;
  userId: string;
  readAt: Date;
}
