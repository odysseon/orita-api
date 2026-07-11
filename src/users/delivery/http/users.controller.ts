import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { UsersService } from '../../use-cases/users.service.js';
import { UploadUserAvatarUseCase } from '../../use-cases/upload-user-avatar.use-case.js';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto.js';
import { UpdateExplorationContextDto } from './dto/update-exploration-context.dto.js';
import { avatarUploadOptions } from './avatar-upload.options.js';
import 'multer';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadAvatarUseCase: UploadUserAvatarUseCase,
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

  @ApiOperation({ summary: 'Upload or replace the current user avatar' })
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', avatarUploadOptions))
  @ApiConsumes('multipart/form-data')
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentIdentity() identity: RequestIdentity,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploadAvatarUseCase.execute(identity.accountId, file);
  }
}
