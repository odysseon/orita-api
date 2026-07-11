import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { MediaStorageService } from '../../../../storage/media-storage.service.js';

@Injectable()
export class OrphanCleanupJob {
  private readonly logger = new Logger(OrphanCleanupJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: MediaStorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    this.logger.log('Starting orphan media cleanup job...');
    await this.cleanupExpiredIntents();
    await this.cleanupDanglingMedia();
    this.logger.log('Orphan media cleanup job finished.');
  }

  private async cleanupExpiredIntents() {
    const expiredIntents = await this.prisma.uploadIntent.findMany({
      where: {
        expiresAt: { lt: new Date() },
        consumedAt: null,
      },
    });

    if (expiredIntents.length === 0) return;

    this.logger.log(`Found ${expiredIntents.length} expired intents to clean up.`);

    for (const intent of expiredIntents) {
      try {
        await this.storageService.deleteMedia(intent.publicId);
        await this.prisma.uploadIntent.delete({ where: { id: intent.id } });
      } catch (error) {
        this.logger.error(`Failed to clean up intent ${intent.id}:`, error);
      }
    }
  }

  private async cleanupDanglingMedia() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const danglingMedia = await this.prisma.media.findMany({
      where: {
        businessProfileId: null,
        listingId: null,
        businessTourId: null,
        reviewId: null,
        createdAt: { lt: yesterday },
      },
    });

    if (danglingMedia.length === 0) return;

    this.logger.log(`Found ${danglingMedia.length} dangling media records to clean up.`);

    for (const media of danglingMedia) {
      try {
        await this.storageService.deleteMedia(media.fileId);
        await this.prisma.media.delete({ where: { id: media.id } });
      } catch (error) {
        this.logger.error(`Failed to clean up dangling media ${media.id}:`, error);
      }
    }
  }
}
