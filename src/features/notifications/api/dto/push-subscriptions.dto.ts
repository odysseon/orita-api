import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class SavePushSubscriptionDto {
  @IsUrl()
  @IsNotEmpty()
  endpoint!: string;

  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  auth!: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  platform?: string;
}

export class DeletePushSubscriptionDto {
  @IsUrl()
  @IsNotEmpty()
  endpoint!: string;
}
