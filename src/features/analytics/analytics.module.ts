import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AnalyticsController } from './api/controllers/analytics.controller.js';
import { AnalyticsService } from './application/use-cases/analytics.service.js';
import { AnalyticsListener } from './application/events/analytics.listener.js';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsListener],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
