import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryItemType } from '../../../../../generated/prisma/client.js';

@Injectable()
export class NotificationEngine {
  private readonly logger = new Logger(NotificationEngine.name);

  /**
   * Evaluates if a new discovery item should trigger an immediate push notification
   * or be deferred to a daily/weekly digest.
   *
   * Criteria to implement:
   * - Proximity (within CategoryDiscoveryPolicy.notificationRadiusKm)
   * - Business Quality (e.g. Verified)
   * - Freshness & Urgency (e.g. Flash sales)
   * - Frequency Caps / Mute Settings
   */
  evaluateAndDispatch(itemType: DiscoveryItemType, businessProfileId: string, referenceId: string) {
    this.logger.debug(
      `[NotificationEngine] Evaluating candidate: ${itemType} ${referenceId} for Business ${businessProfileId}`,
    );

    // Stub: In the future, this will:
    // 1. Fetch the candidate's discovery policy (notificationRadiusKm)
    // 2. Query users who are explicitly interested in this category
    // 3. Filter out users who have muted or exceeded notification quota
    // 4. Calculate score: distance + business_quality + freshness + engagement_prediction
    // 5. Dispatch immediate Push Notification OR add to a Digest Queue
  }
}
