import { Module } from '@nestjs/common';
import { FollowsController } from './api/follows.controller.js';
import { FollowsService } from './application/follows.service.js';

@Module({
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
