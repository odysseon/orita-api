import { Module } from '@nestjs/common';
import { SystemController } from './api/controllers/system.controller.js';
import { SystemService } from './application/system.service.js';
import { CleanupCronService } from './application/cleanup.cron.js';

@Module({
  controllers: [SystemController],
  providers: [SystemService, CleanupCronService],
  exports: [SystemService],
})
export class SystemModule {}
