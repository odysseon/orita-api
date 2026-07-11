export enum NotificationUrgency {
  URGENT = 'URGENT',
  NORMAL = 'NORMAL',
  DIGEST = 'DIGEST',
}

export interface NotificationPayload {
  type: string;
  actorId?: string;
  referenceType?: string;
  referenceId?: string;
  payload: Record<string, unknown>;
}

export abstract class BaseNotificationPolicy<TEvent = unknown> {
  /**
   * Determine if the event warrants a notification.
   */
  abstract isEligible(event: TEvent): Promise<boolean> | boolean;

  /**
   * Resolve the list of user IDs who should receive this notification.
   */
  abstract resolveAudience(event: TEvent): Promise<string[]>;

  /**
   * Determine the urgency of the notification (which maps to channels).
   */
  abstract getUrgency(event: TEvent): NotificationUrgency;

  /**
   * Determine which preference category this notification falls under.
   * e.g., 'messages', 'nearbyDiscoveries', 'following', 'security', 'marketing'
   */
  abstract getPreferenceCategory(): string;

  /**
   * Generate the structured payload for the notification.
   */
  abstract getPayload(event: TEvent): NotificationPayload;
}
