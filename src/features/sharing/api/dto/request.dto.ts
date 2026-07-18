import { IsString, IsOptional, IsNotEmpty, IsEnum, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageEmbedType } from '../../../../../generated/prisma/client.js';

export class InternalShareDto {
  @ApiProperty({ enum: ['BUSINESS', 'LISTING', 'TOUR', 'LOCATION'] })
  @IsEnum(MessageEmbedType)
  embedType!: MessageEmbedType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  recipientIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;
}
