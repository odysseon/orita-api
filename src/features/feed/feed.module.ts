import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { FeedController } from './api/feed.controller.js';
import { FeedConsumer } from './application/feed.consumer.js';
import { PrismaFeedRepository } from './infrastructure/prisma-feed.repository.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { NotificationEngine } from './application/services/notification.engine.js';

@Module({
  imports: [PrismaModule, forwardRef(() => MediaModule)],
  controllers: [FeedController],
  providers: [FeedConsumer, PrismaFeedRepository, NotificationEngine],
  exports: [],
})
export class FeedModule {}
