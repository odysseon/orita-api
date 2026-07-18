import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicUsersService } from '../../use-cases/public-users.service.js';
import { CurrentIdentity, type RequestIdentity, Public } from '@odysseon/whoami-adapter-nestjs';

@ApiTags('Public Users')
@Controller('users')
export class PublicUsersController {
  constructor(private readonly publicUsersService: PublicUsersService) {}

  @Public()
  @ApiOperation({ summary: 'Get a public user profile by username' })
  @Get('username/:username')
  async getPublicProfile(
    @Param('username') username: string,
    @CurrentIdentity() identity?: RequestIdentity,
  ) {
    return this.publicUsersService.getPublicProfile(username, identity?.accountId);
  }

  @ApiOperation({ summary: 'Follow a user by ID' })
  @Post(':id/follow')
  async followUser(@Param('id') id: string, @CurrentIdentity() identity: RequestIdentity) {
    return this.publicUsersService.followUser(id, identity.accountId);
  }

  @ApiOperation({ summary: 'Unfollow a user by ID' })
  @Delete(':id/follow')
  async unfollowUser(@Param('id') id: string, @CurrentIdentity() identity: RequestIdentity) {
    return this.publicUsersService.unfollowUser(id, identity.accountId);
  }
}
