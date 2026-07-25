import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Payload for consuming an avatar upload intent after direct-to-cloud upload.
 */
export class ConsumeAvatarUploadDto {
  /**
   * The ID of the generated upload intent.
   * The publicId, provider, and target folder are derived securely from this intent on the server.
   */
  @IsString()
  @IsNotEmpty()
  intentId!: string;

  /**
   * Optional publicId for backward-compatibility with existing clients.
   * If provided, the server verifies that it matches the intent's generated publicId.
   */
  @IsOptional()
  @IsString()
  publicId?: string;

  /**
   * Optional file version returned by the storage provider (e.g., Cloudinary timestamp version).
   */
  @IsOptional()
  @IsString()
  version?: string;
}
