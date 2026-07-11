import { Controller, Get, Post, Delete, Patch, Param, Body, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FollowsService, type FollowTargetType } from '../application/follows.service.js';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { IdentityService } from '../../../shared/identity/identity.service.js';

class UpdateNotificationsDto {
  enabled!: boolean;
}

@ApiTags('Follows')
@ApiBearerAuth()
@Controller('v1/follows')
export class FollowsController {
  constructor(
    private readonly followsService: FollowsService,
    private readonly identityService: IdentityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user follows' })
  @ApiQuery({ name: 'type', required: false, enum: ['business', 'location'] })
  async getFollows(
    @CurrentIdentity() identity: RequestIdentity,
    @Query('type') type?: FollowTargetType,
  ) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.followsService.getFollows(user.id, type);
  }

  @Post(':type/:id')
  @ApiOperation({ summary: 'Follow a business or location' })
  async follow(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('type') type: FollowTargetType,
    @Param('id') targetId: string,
  ) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.followsService.follow(user.id, type, targetId);
  }

  @Delete(':type/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Unfollow a business or location' })
  async unfollow(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('type') type: FollowTargetType,
    @Param('id') targetId: string,
  ) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    await this.followsService.unfollow(user.id, type, targetId);
  }

  @Get(':type/:id/status')
  @ApiOperation({ summary: 'Check follow status' })
  async getStatus(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('type') type: FollowTargetType,
    @Param('id') targetId: string,
  ) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.followsService.getStatus(user.id, type, targetId);
  }

  @Patch(':type/:id')
  @ApiOperation({ summary: 'Update follow notifications' })
  async updateNotifications(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('type') type: FollowTargetType,
    @Param('id') targetId: string,
    @Body() dto: UpdateNotificationsDto,
  ) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.followsService.setNotifications(user.id, type, targetId, dto.enabled);
  }
}
