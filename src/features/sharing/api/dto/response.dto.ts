import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShareResultDto {
  @ApiProperty()
  recipientId!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  messageId!: string;
}

export class ShareableSearchResultDto {
  @ApiProperty({ enum: ['BUSINESS', 'LISTING', 'TOUR'] })
  type!: 'BUSINESS' | 'LISTING' | 'TOUR';

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  subtitle?: string;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class RecentShareableDto {
  @ApiProperty({ enum: ['BUSINESS', 'LISTING', 'TOUR'] })
  type!: 'BUSINESS' | 'LISTING' | 'TOUR';

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  lastInteractedAt!: Date;
}

export class SuggestedShareRecipientDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  username!: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}
