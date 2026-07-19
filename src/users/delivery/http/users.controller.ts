import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { UsersService } from '../../use-cases/users.service.js';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto.js';
import { UpdateExplorationContextDto } from './dto/update-exploration-context.dto.js';
import { UpdateUserInterestsDto } from './dto/update-user-interest.dto.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  @Get('me')
  async getProfile(@CurrentIdentity() identity: RequestIdentity) {
    return this.usersService.getMyProfile(identity.accountId);
  }

  @ApiOperation({ summary: 'Update the currently authenticated user profile' })
  @Patch('me')
  async updateProfile(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() payload: UpdateUserProfileDto,
  ) {
    return this.usersService.updateMyProfile(identity.accountId, payload);
  }

  @ApiOperation({ summary: 'Update the active exploration context for the user' })
  @Patch('me/exploration-context')
  async updateExplorationContext(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() payload: UpdateExplorationContextDto,
  ) {
    return this.usersService.updateExplorationContext(identity.accountId, payload);
  }

  @ApiOperation({ summary: 'Generate direct-to-cloud upload intent for avatar' })
  @Post('me/media/upload-intent')
  async generateAvatarUploadIntent(
    @CurrentIdentity() identity: RequestIdentity,
  ) {
    return this.usersService.generateAvatarUploadIntent(identity.accountId);
  }

  @ApiOperation({ summary: 'Consume intent and save new avatar media' })
  @Post('me/media')
  async consumeAvatarUploadIntent(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() payload: { intentId: string; publicId: string; version: string },
  ) {
    return this.usersService.consumeAvatarUploadIntent(identity.accountId, payload);
  }

  @ApiOperation({ summary: 'Batch update user explicit interests' })
  @Put('me/interests')
  async updateInterests(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() payload: UpdateUserInterestsDto,
  ) {
    await this.usersService.updateInterests(identity.accountId, payload.categoryIds);
    return { success: true };
  }
}
