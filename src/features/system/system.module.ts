import { Module } from '@nestjs/common';
import { SystemController } from './api/controllers/system.controller.js';
import { SystemService } from './application/system.service.js';

@Module({
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
