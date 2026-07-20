import { Injectable } from '@nestjs/common';
import { MessagePreviewDescriptor } from '../domain/types/messaging.types.js';

@Injectable()
export class NotificationPreviewFactory {
  build(descriptor: MessagePreviewDescriptor): string {
    switch (descriptor.kind) {
      case 'TEXT':
        return descriptor.text || 'Sent a message';
      case 'EMBED':
        switch (descriptor.embedType) {
          case 'BUSINESS':
            return 'Shared a business';
          case 'LISTING':
            return 'Shared a listing';
          case 'LOCATION':
            return 'Shared a location';
          case 'TOUR':
            return 'Shared a tour';
          default:
            return 'Shared an item';
        }
      case 'ATTACHMENT':
        return descriptor.attachmentType === 'VIDEO' ? 'Sent a video' : 'Sent a photo';
      case 'SYSTEM':
        return descriptor.text || 'Sent a message';
      default:
        return 'Sent a message';
    }
  }
}
