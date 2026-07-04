import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { TemplateRendererService } from '../../application/services/template-renderer.service.js';
import { NotificationPayload } from '../../application/policies/base.policy.js';

@Injectable()
@Processor('push_delivery_queue')
export class PushWorker extends WorkerHost {
  private readonly logger = new Logger(PushWorker.name);

  constructor(private readonly templateRenderer: TemplateRendererService) {
    super();
  }

  process(job: Job<{ userId: string; payload: NotificationPayload }>): Promise<void> {
    const { userId, payload } = job.data;

    // 1. Render the template
    const rendered = this.templateRenderer.render(payload);

    // 2. Deliver via Push Provider (Mocked for MVP)
    const pushPayload = {
      recipient: userId,
      title: rendered.title,
      body: rendered.body,
      actionUrl: rendered.actionUrl,
    };

    this.logger.log(
      `[PushWorker] Sending Push Notification: \n${JSON.stringify(pushPayload, null, 2)}`,
    );
    return Promise.resolve();
  }
}
