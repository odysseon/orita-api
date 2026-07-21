import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../configs/validation.js';
import { FeaturesDto, LimitsDto, ServicesDto, VersionDto } from '../api/dto/system-status.dto.js';

@Injectable()
export class SystemService {
  constructor(private readonly config: ConfigService<AppConfig>) {}

  getFeatures(): FeaturesDto {
    return {
      messaging: { enabled: true },
      media: { enabled: true },
      nearby: { enabled: true },
      storeTours: { enabled: true },
      pushNotifications: { enabled: false }, // Feature flag placeholder
    };
  }

  getLimits(): LimitsDto {
    return {
      maxConversationAttachments: this.config.get('MAX_CONVERSATION_ATTACHMENTS', { infer: true })!,
      maxAttachmentSizeMb: this.config.get('MAX_ATTACHMENT_SIZE_MB', { infer: true })!,
      maxNearbyImages: this.config.get('MAX_NEARBY_IMAGES', { infer: true })!,
      maxAvatarSizeMb: this.config.get('MAX_AVATAR_SIZE_MB', { infer: true })!,
      maxBusinessCoverPhotos: this.config.get('MAX_BUSINESS_COVER_PHOTOS', { infer: true })!,
    };
  }

  getVersion(): VersionDto {
    return {
      application: this.config.get('APP_VERSION', { infer: true })!,
      api: this.config.get('API_VERSION', { infer: true })!,
      minimumSupportedClient: this.config.get('MINIMUM_SUPPORTED_CLIENT', { infer: true })!,
    };
  }

  getServices(): ServicesDto {
    // In the future, these can be pulled from DB or env variables based on environment
    return {
      cdn: this.config.get('CDN_URL', { infer: true })!,
      media: this.config.get('MEDIA_URL', { infer: true })!,
      docs: this.config.get('SWAGGER_PATH_DOCS', { infer: true })
        ? `/${this.config.get('SWAGGER_PATH_DOCS', { infer: true })!}`
        : '/api/docs',
      ws: this.config.get('WS_URL', { infer: true })!,
    };
  }

  getEnvironment(): string {
    return this.config.get('NODE_ENV', { infer: true })!;
  }
}
