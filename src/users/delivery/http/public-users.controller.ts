import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation , ApiBearerAuth } from '@nestjs/swagger';
import { PublicUsersService } from '../../use-cases/public-users.service.js';
import {
  CurrentIdentity,
  type RequestIdentity,
  OptionalAuth,
} from '@odysseon/whoami-adapter-nestjs';

@ApiTags('Public Users')
@ApiBearerAuth()
@Controller('users')
export class PublicUsersController {
  constructor(private readonly publicUsersService: PublicUsersService) {}

  @OptionalAuth()
  @ApiOperation({ summary: 'Get a public user profile by username' })
  @Get('username/:username')
  async getPublicProfile(
    @Param('username') username: string,
    @CurrentIdentity({ required: false }) identity?: RequestIdentity,
  ) {
    return this.publicUsersService.getPublicProfile(username, identity?.accountId);
  }

  @ApiOperation({ summary: 'Follow a user by username' })
  @Post(':username/follow')
  async followUser(
    @Param('username') username: string,
    @CurrentIdentity() identity: RequestIdentity,
  ) {
    return this.publicUsersService.followUser(username, identity.accountId);
  }

  @ApiOperation({ summary: 'Unfollow a user by username' })
  @Delete(':username/follow')
  async unfollowUser(
    @Param('username') username: string,
    @CurrentIdentity() identity: RequestIdentity,
  ) {
    return this.publicUsersService.unfollowUser(username, identity.accountId);
  }
}
