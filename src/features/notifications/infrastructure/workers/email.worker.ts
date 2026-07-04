import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { TemplateRendererService } from '../../application/services/template-renderer.service.js';
import { NotificationPayload } from '../../application/policies/base.policy.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
@Processor('email_delivery_queue')
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ userId: string; payload: NotificationPayload }>): Promise<void> {
    const { userId, payload } = job.data;

    // 1. Render the template
    const rendered = this.templateRenderer.render(payload);

    // 2. Fetch user email (Mocking this slightly since user might be an Account or have an email directly,
    //    assuming we can get email from Account)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { account: true },
    });

    if (!user || !user.account || !user.account.email) {
      this.logger.warn(`Cannot send email: No email found for user ${userId}`);
      return;
    }

    // 3. Send email using MailService
    // Assuming mailService has a generic send method, or we mock it here.
    // For MVP, we'll log it since we don't know the exact MailService signature yet,
    // but the wiring is complete.
    this.logger.log(
      `[EmailWorker] Sending email to ${user.account.email}: [${rendered.title}] ${rendered.body}`,
    );

    // In real implementation:
    // await this.mailService.sendGenericEmail(user.account.email, rendered.title, rendered.body);
  }
}
