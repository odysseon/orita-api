import { IsOptional, IsString, IsNumber, IsEnum, IsArray } from 'class-validator';
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
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
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
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number = 0;
}
