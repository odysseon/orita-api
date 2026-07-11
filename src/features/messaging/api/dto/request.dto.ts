import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnchorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetId!: string;
}

export class MessageEmbedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  embedType!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetId!: string;
}

export class CreateConversationDto {
  @ApiProperty({ enum: ['DIRECT', 'GROUP'] })
  @IsEnum(['DIRECT', 'GROUP'])
  type!: 'DIRECT' | 'GROUP';

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  invitedParticipantIds!: string[];

  @ApiPropertyOptional({ type: AnchorDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AnchorDto)
  anchor?: AnchorDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initialMessage?: string;
}

export class SendMessageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ enum: ['IMAGE', 'VIDEO'] })
  @IsOptional()
  @IsEnum(['IMAGE', 'VIDEO'])
  mediaType?: 'IMAGE' | 'VIDEO';

  @ApiPropertyOptional({ type: [MessageEmbedDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageEmbedDto)
  embeds?: MessageEmbedDto[];
}

export class UpdateConversationStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'CLOSED'] })
  @IsEnum(['ACTIVE', 'CLOSED'])
  status!: 'ACTIVE' | 'CLOSED';
}

export class MarkMessagesReadDto {
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  messageIds!: string[];
}
