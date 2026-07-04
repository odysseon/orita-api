import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseNotificationPolicy } from '../policies/base.policy.js';
import { PreferenceFilterService } from '../services/preference-filter.service.js';
import { ChannelRouterService, DeliveryChannel } from '../services/channel-router.service.js';

@Injectable()
export class NotificationEngine {
  constructor(
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
    const payload = policy.getPayload(event);

    // 6. Enqueue Jobs for each channel and user
    // In a real high-scale system, you might chunk this or push a single job that fans out.
    // For MVP, we enqueue a job per user per channel.
    const jobs = [];

    for (const userId of finalAudience) {
      const jobData = { userId, payload };

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
