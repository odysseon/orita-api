import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import { SHARE_DEDUP_WINDOW_MS } from '../../domain/constants/sharing.constants.js';
import type { EnrichedDomainEvent } from '../../../../shared/events/event-bus.service.js';

interface ContentSharedEvent {
  senderId: string;
  recipientId: string;
  embedType: 'BUSINESS' | 'LISTING' | 'TOUR' | 'LOCATION';
  targetId: string;
}

@Injectable()
export class ShareAnalyticsConsumer {
  private readonly logger = new Logger(ShareAnalyticsConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  @OnEvent('content.shared')
  async handleContentShared(payload: EnrichedDomainEvent<ContentSharedEvent>) {
    try {
      const data = payload.data;

      // 1. Always insert a new ItemShare row
      const share = await this.prisma.itemShare.create({
        data: {
          senderId: data.senderId,
          recipientId: data.recipientId,
          embedType: data.embedType,
          targetId: data.targetId,
        },
      });

      // 2. Query for previous shares within the dedup window
      const dedupCutoff = new Date(Date.now() - SHARE_DEDUP_WINDOW_MS);

      const previousShare = await this.prisma.itemShare.findFirst({
        where: {
          senderId: data.senderId,
          recipientId: data.recipientId,
          embedType: data.embedType,
          targetId: data.targetId,
          createdAt: {
            gte: dedupCutoff,
          },
          id: {
            not: share.id, // exclude the one we just created
          },
        },
      });

      // 3. Emit unique-content.shared if unique
      if (!previousShare) {
        await this.eventBus.publish('unique-content.shared', data);
      }
    } catch (error) {
      this.logger.error(`Failed to handle content shared: ${String(error)}`);
    }
  }
}
