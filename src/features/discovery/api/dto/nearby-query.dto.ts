import { IsNumber, IsOptional, IsString, IsArray, IsEnum, Max, Min } from 'class-validator';
import { OpportunityType } from '../../../../../generated/prisma/client.js';
import { Type, Transform } from 'class-transformer';

export class NearbyQueryDto {
  @IsNumber()
  @Type(() => Number)
  lat!: number;

  @IsNumber()
  @Type(() => Number)
  lng!: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(20)
  @Type(() => Number)
  radiusKm?: number = 2;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursorId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cursorScore?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(OpportunityType, { each: true })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : undefined,
  )
  types?: OpportunityType[];
}
