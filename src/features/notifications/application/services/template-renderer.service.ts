import { Injectable } from '@nestjs/common';
import { NotificationPayload } from '../policies/base.policy.js';

export interface RenderedTemplate {
  title: string;
  body: string;
  actionUrl?: string;
}

@Injectable()
export class TemplateRendererService {
  /**
   * Translates a structured notification payload into localized text
   * for external channels (Push, Email).
   */
  render(payload: NotificationPayload): RenderedTemplate {
    switch (payload.type) {
      case 'NEW_LISTING': {
        const businessName = (payload.payload['businessName'] as string) || 'A business';
        const listingTitle = (payload.payload['listingTitle'] as string) || 'a new item';
        return {
          title: 'New nearby discovery! 🌟',
          body: `${businessName} just added ${listingTitle} near you.`,
          actionUrl: `/listings/${payload.referenceId}`,
        };
      }

      case 'MESSAGE_RECEIVED': {
        const senderName = (payload.payload['senderName'] as string) || 'Someone';
        return {
          title: `New message from ${senderName}`,
          body: `Tap to view and reply to ${senderName}.`,
          actionUrl: `/messages/${payload.referenceId}`, // conversationId
        };
      }

      case 'BUSINESS_VERIFIED': {
        const businessName = (payload.payload['businessName'] as string) || 'Your business';
        return {
          title: 'Business Verified! ✅',
          body: `${businessName} is now fully verified and public on Oríta.`,
          actionUrl: `/businesses/${payload.referenceId}`,
        };
      }

      default:
        return {
          title: 'New Notification',
          body: 'You have a new update on Oríta.',
        };
    }
  }
}
