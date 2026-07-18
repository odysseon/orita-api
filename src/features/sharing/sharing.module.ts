import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { MessagingModule } from '../messaging/messaging.module.js';
import { MediaModule } from '../media/media.module.js';
import { ShareService } from './application/services/share.service.js';
import { SuggestedRecipientsService } from './application/services/suggested-recipients.service.js';
import { ShareAnalyticsConsumer } from './application/consumers/share-analytics.consumer.js';
import { ShareController } from './api/controllers/share.controller.js';

@Module({
  imports: [PrismaModule, MessagingModule, MediaModule],
  controllers: [ShareController],
  providers: [ShareService, SuggestedRecipientsService, ShareAnalyticsConsumer],
  exports: [ShareService],
})
export class SharingModule {}
