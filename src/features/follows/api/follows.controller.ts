import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FollowsService, type FollowTargetType } from '../application/follows.service.js';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';

class UpdateNotificationsDto {
  enabled!: boolean;
}

@ApiTags('Follows')
@ApiBearerAuth()

@Controller('v1/follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user follows' })
  @ApiQuery({ name: 'type', required: false, enum: ['business', 'location'] })
  async getFollows(@CurrentIdentity() identity: RequestIdentity, @Query('type') type?: FollowTargetType) {
    return this.followsService.getFollows(identity.accountId, type);
  }

  @Post(':type/:id')
  @ApiOperation({ summary: 'Follow a business or location' })
  async follow(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('type') type: FollowTargetType,
    @Param('id') targetId: string,
  ) {
    return this.followsService.follow(identity.accountId, type, targetId);
  }

  @Delete(':type/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Unfollow a business or location' })
  async unfollow(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('type') type: FollowTargetType,
    @Param('id') targetId: string,
  ) {
    await this.followsService.unfollow(identity.accountId, type, targetId);
  }

  @Get(':type/:id/status')
  @ApiOperation({ summary: 'Check follow status' })
  async getStatus(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('type') type: FollowTargetType,
    @Param('id') targetId: string,
  ) {
    return this.followsService.getStatus(identity.accountId, type, targetId);
  }

  @Patch(':type/:id')
  @ApiOperation({ summary: 'Update follow notifications' })
  async updateNotifications(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('type') type: FollowTargetType,
    @Param('id') targetId: string,
    @Body() dto: UpdateNotificationsDto,
  ) {
    return this.followsService.setNotifications(identity.accountId, type, targetId, dto.enabled);
  }
}
