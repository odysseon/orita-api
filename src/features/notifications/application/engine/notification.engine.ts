import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseNotificationPolicy } from '../policies/base.policy.js';
import { PreferenceFilterService } from '../services/preference-filter.service.js';
import { ChannelRouterService, DeliveryChannel } from '../services/channel-router.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Prisma } from '../../../../../generated/prisma/client.js';

@Injectable()
export class NotificationEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preferenceFilter: PreferenceFilterService,
    private readonly channelRouter: ChannelRouterService,
    @InjectQueue('email_delivery_queue') private readonly emailQueue: Queue,
    @InjectQueue('push_delivery_queue') private readonly pushQueue: Queue,
    @InjectQueue('in_app_delivery_queue') private readonly inAppQueue: Queue,
  ) {}

  /**
   * The core pipeline that processes an event through a policy.
   */
  async process<TEvent>(policy: BaseNotificationPolicy<TEvent>, event: TEvent): Promise<void> {
    // 1. Eligibility
    const isEligible = await policy.isEligible(event);
    if (!isEligible) return;

    // 2. Audience Resolution
    const audience = await policy.resolveAudience(event);
    if (audience.length === 0) return;

    // 3. Urgency & Channel Resolution
    const urgency = policy.getUrgency(event);
    const channels = this.channelRouter.route(urgency);
    if (channels.length === 0) return;

    // 4. Preference Filtering
    const category = policy.getPreferenceCategory();
    const finalAudience = await this.preferenceFilter.filter(audience, category);
    if (finalAudience.length === 0) return;

    // 5. Build Payload
    const payload = await policy.getPayload(event);

    // 6. Enqueue Jobs for each channel and user
    const jobs = [];

    for (const userId of finalAudience) {
      // 6a. Persist Notification Entity Centrally
      let notification;
      try {
        notification = await this.prisma.inAppNotification.create({
          data: {
            userId,
            type: payload.type,
            actorId: payload.actorId || null,
            referenceType: payload.referenceType || null,
            referenceId: payload.referenceId || null,
            payload: payload.payload as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Deduplication constraint hit (e.g. user follows business AND is nearby)
          continue;
        }
        throw error;
      }

      const jobData = { userId, notificationId: notification.id };

      for (const channel of channels) {
        if (channel === DeliveryChannel.IN_APP) {
          jobs.push(this.inAppQueue.add('deliver_in_app', jobData));
        } else if (channel === DeliveryChannel.PUSH) {
          jobs.push(this.pushQueue.add('deliver_push', jobData));
        } else if (channel === DeliveryChannel.EMAIL) {
          jobs.push(this.emailQueue.add('deliver_email', jobData));
        }
      }
    }

    await Promise.all(jobs);
    console.log(`[NotificationEngine] Enqueued ${jobs.length} jobs for event.`);
  }
}
