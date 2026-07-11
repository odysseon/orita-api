import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationPayload } from '../../application/policies/base.policy.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Prisma } from '../../../../../generated/prisma/client.js';

@Injectable()
@Processor('in_app_delivery_queue')
export class InAppWorker extends WorkerHost {
  private readonly logger = new Logger(InAppWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ userId: string; payload: NotificationPayload }>): Promise<void> {
    const { userId, payload } = job.data;

    // Save structured payload to DB
    await this.prisma.inAppNotification.create({
      data: {
        userId,
        type: payload.type,
        actorId: payload.actorId || null,
        referenceType: payload.referenceType || null,
        referenceId: payload.referenceId || null,
        payload: payload.payload as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`[InAppWorker] Persisted In-App notification for user ${userId}`);
  }
}
