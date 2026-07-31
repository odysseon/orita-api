import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
  IsObject,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseServiceAreaDto } from '../../../../features/business-profile/api/dto/service-area.dto.js';
import { ListingStatus } from '../../domain/types/listing-status.enum.js';
import { ListingAvailability } from '../../domain/types/listing-availability.enum.js';

export class ListingPriceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPrice?: number;

  /**
   * Currency is required when a price is set.
   */
  @ValidateIf((o: ListingPriceDto) => o.minPrice !== undefined || o.maxPrice !== undefined)
  @IsString()
  currencyCode?: string = 'NGN';

  @IsBoolean()
  isNegotiable!: boolean;
}

export class CreateListingDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ListingPriceDto)
  price?: ListingPriceDto;

  @IsOptional()
  @IsEnum(ListingAvailability)
  availability?: ListingAvailability;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseServiceAreaDto)
  serviceAreas?: BaseServiceAreaDto[];
}

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ListingPriceDto)
  price?: ListingPriceDto;

  @IsOptional()
  @IsEnum(ListingAvailability)
  availability?: ListingAvailability;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseServiceAreaDto)
  serviceAreas?: BaseServiceAreaDto[];
}

export class TransitionListingStatusDto {
  @IsEnum(ListingStatus)
  status!: ListingStatus;
}

export class GetListingsQueryDto {
  @IsOptional()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  minPrice?: string;

  @IsOptional()
  @IsString()
  maxPrice?: string;

  @IsOptional()
  @IsString()
  isNegotiable?: string;

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
  categorySlug?: string;

  @IsOptional()
  @IsString()
  lat?: string;

  @IsOptional()
  @IsString()
  lng?: string;

  @IsOptional()
  @IsString()
  radius?: string;

  /**
   * JSON stringified attributes filter (e.g., {"brand":"Samsung"})
   */
  @IsOptional()
  @IsString()
  attributes?: string;
}
