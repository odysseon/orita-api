import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserInterestsDto {
  /**
   * Array of Category IDs the user is explicitly interested in.
   * @example ["cmrhwnjhl0001m0fxfcpxmwyl"]
   */
  @ApiProperty({ description: 'Array of Category IDs the user is explicitly interested in' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  categoryIds!: string[];
}
