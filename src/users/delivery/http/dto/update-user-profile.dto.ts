import { IsString, IsOptional } from 'class-validator';

/**
 * Payload for updating a user's profile information.
 * Used after a successful media upload to link the avatar to the user.
 */
export class UpdateUserProfileDto {
  /**
   * The updated username of the user.
   * @example "hammed_anu"
   */
  @IsOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
