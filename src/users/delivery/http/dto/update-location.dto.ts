import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formattedAddress?: string;
}
