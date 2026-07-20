import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceDto {
  @ApiProperty({ example: false })
  enabled!: boolean;

  @ApiProperty({ example: null, nullable: true, type: String })
  message!: string | null;
}

export class VersionDto {
  @ApiProperty({ example: '1.8.0' })
  application!: string;

  @ApiProperty({ example: 'v1' })
  api!: string;

  @ApiProperty({ example: '1.6.0' })
  minimumSupportedClient!: string;
}

export class LimitsDto {
  @ApiProperty({ example: 10 })
  maxConversationAttachments!: number;

  @ApiProperty({ example: 25 })
  maxAttachmentSizeMb!: number;

  @ApiProperty({ example: 5 })
  maxNearbyImages!: number;

  @ApiProperty({ example: 5 })
  maxAvatarSizeMb!: number;

  @ApiProperty({ example: 10 })
  maxBusinessCoverPhotos!: number;
}

export class FeatureStateDto {
  @ApiProperty({ example: true })
  enabled!: boolean;
}

export class FeaturesDto {
  @ApiProperty({ type: FeatureStateDto })
  messaging!: FeatureStateDto;

  @ApiProperty({ type: FeatureStateDto })
  media!: FeatureStateDto;

  @ApiProperty({ type: FeatureStateDto })
  nearby!: FeatureStateDto;

  @ApiProperty({ type: FeatureStateDto })
  storeTours!: FeatureStateDto;

  @ApiProperty({ type: FeatureStateDto })
  pushNotifications!: FeatureStateDto;
}

export class ServicesDto {
  @ApiProperty({ example: 'https://cdn.orita.app' })
  cdn!: string;

  @ApiProperty({ example: 'https://media.orita.app' })
  media!: string;

  @ApiProperty({ example: 'https://docs.orita.app' })
  docs!: string;

  @ApiProperty({ example: 'wss://api.orita.app' })
  ws!: string;
}

export class SystemStatusDto {
  @ApiProperty({ example: 'operational' })
  status!: string;

  @ApiProperty({ example: '2026-07-20T18:20:00Z' })
  timestamp!: string;

  @ApiProperty({ example: 'req-12345' })
  requestId!: string;

  @ApiProperty({ example: 'production' })
  environment!: string;

  @ApiProperty({ type: MaintenanceDto })
  maintenance!: MaintenanceDto;

  @ApiProperty({ type: VersionDto })
  version!: VersionDto;

  @ApiProperty({ type: LimitsDto })
  limits!: LimitsDto;

  @ApiProperty({ type: FeaturesDto })
  features!: FeaturesDto;

  @ApiProperty({ type: ServicesDto })
  services!: ServicesDto;
}
