import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConversationView,
  MessageView,
  MessageReadReceiptView,
  ConversationAnchorView,
  MessageEmbedView,
  MessageAttachmentView,
} from '../../domain/types/messaging.types.js';

export class MessageReadReceiptResponseDto {
  @ApiProperty() messageId!: string;
  @ApiProperty() participantId!: string;
  @ApiProperty() readAt!: Date;

  static from(r: MessageReadReceiptView): MessageReadReceiptResponseDto {
    const dto = new MessageReadReceiptResponseDto();
    dto.messageId = r.messageId;
    dto.participantId = r.participantId;
    dto.readAt = r.readAt;
    return dto;
  }
}

export class MessageEmbedResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() embedType!: string;
  @ApiProperty() targetId!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() subtitle!: string | null;
  @ApiPropertyOptional() imageUrl!: string | null;
  @ApiPropertyOptional() ctaLabel!: string | null;
  @ApiPropertyOptional() ctaPath!: string | null;

  static from(e: MessageEmbedView): MessageEmbedResponseDto {
    const dto = new MessageEmbedResponseDto();
    dto.id = e.id;
    dto.embedType = e.embedType;
    dto.targetId = e.targetId;
    dto.title = e.title;
    dto.subtitle = e.subtitle;
    dto.imageUrl = e.imageUrl;
    dto.ctaLabel = e.ctaLabel;
    dto.ctaPath = e.ctaPath;
    return dto;
  }
}

export class MessageAttachmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() mediaType!: string;
  @ApiProperty() mimeType!: string;
  @ApiPropertyOptional() bytes!: number | null;

  static from(a: MessageAttachmentView): MessageAttachmentResponseDto {
    const dto = new MessageAttachmentResponseDto();
    dto.id = a.id;
    dto.url = a.url;
    dto.mediaType = a.mediaType;
    dto.mimeType = a.mimeType;
    dto.bytes = a.bytes;
    return dto;
  }
}

export class MessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() conversationId!: string;
  @ApiProperty() participantId!: string;
  @ApiProperty() senderDisplayName!: string;
  @ApiPropertyOptional() senderAvatarUrl!: string | null;
  @ApiPropertyOptional() content!: string | null;
  @ApiPropertyOptional() mediaUrl!: string | null;
  @ApiPropertyOptional() mediaType!: string | null;
  @ApiProperty({ type: [MessageAttachmentResponseDto] })
  attachments!: MessageAttachmentResponseDto[];
  @ApiProperty({ type: [MessageEmbedResponseDto] }) embeds!: MessageEmbedResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: [MessageReadReceiptResponseDto] })
  readReceipts!: MessageReadReceiptResponseDto[];

  static from(m: MessageView): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = m.id;
    dto.conversationId = m.conversationId;
    dto.participantId = m.participantId;
    dto.senderDisplayName = m.senderDisplayName;
    dto.senderAvatarUrl = m.senderAvatarUrl;
    dto.content = m.content;
    dto.mediaUrl = m.mediaUrl;
    dto.mediaType = m.mediaType;
    dto.attachments = (m.attachments || []).map((a) => MessageAttachmentResponseDto.from(a));
    dto.embeds = m.embeds.map((e) => MessageEmbedResponseDto.from(e));
    dto.createdAt = m.createdAt;
    dto.readReceipts = m.readReceipts.map((r) => MessageReadReceiptResponseDto.from(r));
    return dto;
  }
}

export class ConversationAnchorResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() subtitle!: string | null;
  @ApiPropertyOptional() imageUrl!: string | null;
  @ApiPropertyOptional() businessId!: string | null;
  @ApiPropertyOptional() listingId!: string | null;
  @ApiPropertyOptional() tourId!: string | null;
  @ApiPropertyOptional() locationId!: string | null;

  static from(a: ConversationAnchorView): ConversationAnchorResponseDto {
    const dto = new ConversationAnchorResponseDto();
    dto.id = a.id;
    dto.title = a.title;
    dto.subtitle = a.subtitle;
    dto.imageUrl = a.imageUrl;
    dto.businessId = a.businessId;
    dto.listingId = a.listingId;
    dto.tourId = a.tourId;
    dto.locationId = a.locationId;
    return dto;
  }
}

export class ConversationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() title!: string | null;
  @ApiPropertyOptional() anchorId!: string | null;
  @ApiPropertyOptional({ type: ConversationAnchorResponseDto })
  anchor?: ConversationAnchorResponseDto | null;
  @ApiProperty({ type: [String] }) participantIds!: string[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ type: [MessageResponseDto] }) messages?: MessageResponseDto[];
  @ApiPropertyOptional() viewer?: { participantId: string };

  static from(
    c: ConversationView,
    messages?: MessageView[],
    viewerParticipantId?: string,
  ): ConversationResponseDto {
    const dto = new ConversationResponseDto();
    dto.id = c.id;
    dto.type = c.type;
    dto.status = c.status;
    dto.title = c.title;
    dto.anchorId = c.anchorId;
    if (c.anchor) {
      dto.anchor = ConversationAnchorResponseDto.from(c.anchor);
    } else {
      dto.anchor = null;
    }
    dto.participantIds = c.participantIds;
    dto.createdAt = c.createdAt;
    dto.updatedAt = c.updatedAt;
    if (messages) dto.messages = messages.map((m) => MessageResponseDto.from(m));
    if (viewerParticipantId) dto.viewer = { participantId: viewerParticipantId };
    return dto;
  }
}

export class MessagePreviewResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() content!: string | null;
  @ApiProperty() participantId!: string;
  @ApiProperty() senderDisplayName!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty()
  descriptor!: import('../../domain/types/messaging.types.js').MessagePreviewDescriptor;

  static from(
    m: import('../../domain/types/messaging.types.js').MessagePreviewView,
  ): MessagePreviewResponseDto {
    const dto = new MessagePreviewResponseDto();
    dto.id = m.id;
    dto.content = m.content;
    dto.participantId = m.participantId;
    dto.senderDisplayName = m.senderDisplayName;
    dto.createdAt = m.createdAt;
    dto.descriptor = m.descriptor;
    return dto;
  }
}

export class ConversationPreviewResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() avatarUrl!: string | null;
  @ApiPropertyOptional({ type: MessagePreviewResponseDto })
  latestMessage?: MessagePreviewResponseDto;
  @ApiProperty() unreadCount!: number;
  @ApiProperty() lastActivityAt!: Date;

  static from(
    c: import('../../domain/types/messaging.types.js').ConversationPreviewView,
  ): ConversationPreviewResponseDto {
    const dto = new ConversationPreviewResponseDto();
    dto.id = c.id;
    dto.type = c.type;
    dto.title = c.title;
    dto.avatarUrl = c.avatarUrl || null;
    if (c.latestMessage) {
      dto.latestMessage = MessagePreviewResponseDto.from(c.latestMessage);
    }
    dto.unreadCount = c.unreadCount;
    dto.lastActivityAt = c.lastActivityAt;
    return dto;
  }
}
