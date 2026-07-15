import { Injectable } from '@nestjs/common';
import { MessagePreviewView, MessagePreviewType } from '../domain/types/messaging.types.js';

@Injectable()
export class MessagePreviewFactory {
  create(message: any): MessagePreviewView {
    const hasEmbeds = message.embeds && message.embeds.length > 0;
    
    let previewType: MessagePreviewType = 'TEXT';
    let snippet = message.content || '';

    if (hasEmbeds) {
      previewType = 'EMBED';
      const embed = message.embeds[0];
      if (embed.embedType === 'BUSINESS') snippet = '📍 Shared a business';
      else if (embed.embedType === 'LISTING') snippet = '🛍️ Shared a listing';
      else if (embed.embedType === 'LOCATION') snippet = '🗺️ Shared a location';
      else if (embed.embedType === 'TOUR') snippet = '🚶 Shared a tour';
      else snippet = 'Shared an item';
    } else if (message.mediaUrl) {
      previewType = 'MEDIA';
      snippet = message.mediaType === 'VIDEO' ? '🎥 Sent a video' : '🖼️ Sent a photo';
    }

    // Default fallback
    if (!snippet) {
      snippet = 'Sent a message';
    }

    return {
      id: message.id,
      content: message.content,
      participantId: message.participantId,
      senderDisplayName: message.senderDisplayName,
      createdAt: message.createdAt,
      previewType,
      snippet,
    };
  }
}
