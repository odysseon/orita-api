import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageEmbedDto } from './request.dto.js';
import { MessageView } from '../../domain/types/messaging.types.js';

// Client → Server

export class WsSendMessagePayload {
  @IsString() @IsNotEmpty() conversationId!: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsEnum(['IMAGE', 'VIDEO']) mediaType?: 'IMAGE' | 'VIDEO';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageEmbedDto)
  embeds?: MessageEmbedDto[];
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
  message: MessageView;
}

export interface WsReadReceiptEvent {
  conversationId: string;
  messageId: string;
  participantId: string;
  readAt: Date;
}
