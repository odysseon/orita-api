import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../../../../../generated/prisma/client.js';

@Injectable()
export class MediaUrlService {
  private readonly cloudinaryCloudName: string;
  private readonly b2PublicUrlBase: string;
  private readonly b2Endpoint: string;
  private readonly b2BucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.cloudinaryCloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';

    this.b2BucketName = this.configService.get<string>('B2_BUCKET_NAME', '');
    let b2Endpoint = this.configService.get<string>('B2_ENDPOINT', '');
    if (b2Endpoint && !b2Endpoint.startsWith('http://') && !b2Endpoint.startsWith('https://')) {
      b2Endpoint = `https://${b2Endpoint}`;
    }
    this.b2Endpoint = b2Endpoint;
    const configuredPublicBase = this.configService.get<string>('B2_PUBLIC_URL_BASE');
    this.b2PublicUrlBase = configuredPublicBase ?? `${this.b2Endpoint}/file/${this.b2BucketName}`;
  }

  getMediaUrl(
    provider: StorageProvider,
    fileId: string,
    mimeType: string,
    version?: string | null,
    format?: string | null,
  ): string {
    if (provider === StorageProvider.CLOUDINARY) {
      const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';
      const versionStr = version ? `v${version}/` : '';
      const formatStr = format ? `.${format}` : '';

      const hasExt = fileId.includes('.');
      const finalExt = !hasExt && formatStr ? formatStr : '';

      return `https://res.cloudinary.com/${this.cloudinaryCloudName}/${resourceType}/upload/${versionStr}${fileId}${finalExt}`;
    }

    if (provider === StorageProvider.BACKBLAZE) {
      return `${this.b2PublicUrlBase}/${fileId}`;
    }

    throw new Error(`Unsupported storage provider: ${String(provider)}`);
  }
}
