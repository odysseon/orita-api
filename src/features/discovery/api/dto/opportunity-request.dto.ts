import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDate, IsArray } from 'class-validator';
import { OpportunityType } from '../../../../../generated/prisma/client.js';
import { Type } from 'class-transformer';

export class CreateOpportunityDto {
  @IsEnum(OpportunityType)
  type!: OpportunityType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsString()
  @IsNotEmpty()
  locationId!: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  @IsString()
  businessProfileId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaFileIds?: string[];
}

export class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaFileIds?: string[];
}
