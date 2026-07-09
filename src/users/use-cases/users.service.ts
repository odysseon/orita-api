import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../core/ports/user.repository.interface.js';
import { UpdateUserProfileDto } from '../delivery/http/dto/update-user-profile.dto.js';
import { MediaStorageService } from '../../storage/media-storage.service.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async getMyProfile(accountId: string) {
    const user = await this.userRepository.findByAccountId(accountId);
    if (!user) {
      throw new NotFoundException('User profile not found. Please complete registration.');
    }
    return user;
  }

  async updateMyProfile(accountId: string, payload: UpdateUserProfileDto) {
    // Fetch the existing profile to check current state
    const currentUser = await this.getMyProfile(accountId);

    // Identify if an old avatar is being orphaned
    const oldAvatarId = currentUser.avatarId;
    const isReplacingAvatar = payload.avatarId && oldAvatarId && payload.avatarId !== oldAvatarId;

    // Update the database first (Prioritize data integrity)
    const updatedProfile = await this.userRepository.updateProfile(accountId, payload);

    // Clean up the orphaned image from the storage provider
    if (isReplacingAvatar) {
      await this.mediaStorage.deleteMedia(oldAvatarId);
    }

    return updatedProfile;
  }
}
