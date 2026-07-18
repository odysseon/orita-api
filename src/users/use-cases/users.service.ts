import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../core/ports/user.repository.interface.js';
import { UpdateUserProfileDto } from '../delivery/http/dto/update-user-profile.dto.js';
import { UpdateExplorationContextDto } from '../delivery/http/dto/update-exploration-context.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async getMyProfile(accountId: string) {
    const user = await this.userRepository.findByAccountId(accountId);
    if (!user) {
      throw new NotFoundException('User profile not found. Please complete registration.');
    }
    return user;
  }

  async updateMyProfile(accountId: string, payload: UpdateUserProfileDto) {
    // Update the database (Prioritize data integrity)
    return this.userRepository.updateProfile(accountId, payload);
  }

  async updateExplorationContext(accountId: string, payload: UpdateExplorationContextDto) {
    return this.userRepository.updateExplorationContext(accountId, payload);
  }

  async updateInterests(accountId: string, categoryIds: string[]) {
    return this.userRepository.updateInterests(accountId, categoryIds);
  }
}
