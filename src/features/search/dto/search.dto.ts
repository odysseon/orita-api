import { IsOptional, IsString, IsNumber, IsEnum, IsArray, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum ListingSortOption {
  RELEVANCE = 'relevance',
  DISTANCE = 'distance',
  NEWEST = 'newest',
  PRICE_LOW = 'price_low',
  PRICE_HIGH = 'price_high',
}

export enum BusinessSortOption {
  RELEVANCE = 'relevance',
  DISTANCE = 'distance',
  NEWEST = 'newest',
  POPULAR = 'popular',
}

export enum TourSortOption {
  RELEVANCE = 'relevance',
  DISTANCE = 'distance',
  NEWEST = 'newest',
}

export class SearchListingsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(50000)
  radius?: number = 15000;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? (value as string[]) : [String(value)]))
  @IsArray()
  @IsString({ each: true })
  filter?: string[];

  @IsOptional()
  @IsEnum(ListingSortOption)
  sort?: ListingSortOption = ListingSortOption.RELEVANCE;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  offset?: number = 0;
}

export class SearchBusinessesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(50000)
  radius?: number = 15000;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? (value as string[]) : [String(value)]))
  @IsArray()
  @IsString({ each: true })
  filter?: string[];

  @IsOptional()
  @IsEnum(BusinessSortOption)
  sort?: BusinessSortOption = BusinessSortOption.RELEVANCE;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  offset?: number = 0;
}

export class SearchUsersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  offset?: number = 0;
}

export class SearchToursDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(50000)
  radius?: number = 15000;

  @IsOptional()
  @IsEnum(TourSortOption)
  sort?: TourSortOption = TourSortOption.RELEVANCE;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  offset?: number = 0;
}
