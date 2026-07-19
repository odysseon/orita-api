import { UpdateUserProfileDto } from '../../delivery/http/dto/update-user-profile.dto.js';
import { UpdateExplorationContextDto } from '../../delivery/http/dto/update-exploration-context.dto.js';
import { UserEntity } from '../domain/user.types.js';

export const USER_REPOSITORY_TOKEN = Symbol('USER_REPOSITORY_TOKEN');

export interface IUserRepository {
  /**
   * Creates a new domain user.
   */
  create(accountId: string, username: string, avatarUrl?: string): Promise<UserEntity>;

  /**
   * Retrieves a domain user by their associated authentication account ID.
   */
  findByAccountId(accountId: string): Promise<UserEntity | null>;

  /**
   * Partially updates a user's profile.
   */
  updateProfile(accountId: string, payload: UpdateUserProfileDto): Promise<UserEntity>;

  /**
   * Updates a user's location via PostGIS coordinates.
   */

  /**
   * Updates the user's active exploration context.
   */
  updateExplorationContext(
    accountId: string,
    payload: UpdateExplorationContextDto,
  ): Promise<UserEntity>;

  /**
   * Replace the user's explicit interests with a new set.
   */
  updateInterests(accountId: string, categoryIds: string[]): Promise<void>;

  /**
   * Clears the user profile cache.
   */
  clearCache(accountId: string): Promise<void>;
}
