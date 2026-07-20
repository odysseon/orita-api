import { Injectable } from '@nestjs/common';
import {
  MessagePreviewView,
  MessagePreviewDescriptor,
  MessageMediaType,
} from '../domain/types/messaging.types.js';

export interface MessagePreviewInput {
  id: string;
  content: string | null;
  participantId: string;
  senderDisplayName: string;
  createdAt: Date;
  mediaUrl: string | null;
  mediaType: string | null;
  embeds?: { embedType: import('../../../../generated/prisma/client.js').MessageEmbedType }[];
  attachments?: { mediaType: string }[];
}

@Injectable()
export class MessagePreviewFactory {
  create(message: MessagePreviewInput): MessagePreviewView {
    const hasEmbeds = message.embeds && message.embeds.length > 0;

    let descriptor: MessagePreviewDescriptor;

    if (hasEmbeds) {
      descriptor = {
        kind: 'EMBED',
        embedType: message.embeds![0]!.embedType,
      };
    } else if (message.attachments && message.attachments.length > 0) {
      descriptor = {
        kind: 'ATTACHMENT',
        attachmentType: (message.attachments[0]!.mediaType as MessageMediaType) || 'IMAGE',
      };
    } else if (message.mediaUrl) {
      descriptor = {
        kind: 'ATTACHMENT',
        attachmentType: (message.mediaType as MessageMediaType) || 'IMAGE',
      };
    } else if (message.content) {
      descriptor = {
        kind: 'TEXT',
        text: message.content,
      };
    } else {
      descriptor = {
        kind: 'SYSTEM',
        text: 'Sent a message',
      };
    }

    return {
      id: message.id,
      content: message.content,
      participantId: message.participantId,
      senderDisplayName: message.senderDisplayName,
      createdAt: message.createdAt,
      descriptor,
    };
  }
}
