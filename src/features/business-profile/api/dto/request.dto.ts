import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessType, ServiceMode } from '../../../../../generated/prisma/client.js';
import { BaseServiceAreaDto } from './service-area.dto.js';
import { IsE164Phone } from './is-e164-phone.validator.js';

export class CreateBusinessProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsE164Phone()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @IsE164Phone()
  @MaxLength(30)
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsString()
  primaryCategoryId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  secondaryCategoryIds?: string[];
}

export class UpdateBusinessProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @IsE164Phone()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @IsE164Phone()
  @MaxLength(30)
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @IsString()
  primaryCategoryId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  secondaryCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(ServiceMode, { each: true })
  serviceModes?: ServiceMode[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseServiceAreaDto)
  serviceAreas?: BaseServiceAreaDto[];
}

export class GetBusinessesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  lat?: string;

  @IsOptional()
  @IsString()
  lng?: string;

  @IsOptional()
  @IsString()
  radius?: string;
}
