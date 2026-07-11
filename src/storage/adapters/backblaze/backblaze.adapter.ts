import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { isError } from '../../../shared/utils/error.util.js';
import {
  StorageProvider,
  UploadParams,
  UploadResult,
  DeleteResult,
  UploadSignatureResult,
} from '../../ports/provider.port.js';
import { BACKBLAZE_CLIENT, BACKBLAZE_CONFIG, type BackblazeConfig } from './backblaze.provider.js';
import { StorageProvider as ProviderEnum } from '../../../../generated/prisma/client.js';

@Injectable()
export class BackblazeStorageProvider implements StorageProvider {
  private readonly logger = new Logger(BackblazeStorageProvider.name);

  constructor(
    @Inject(BACKBLAZE_CLIENT) private readonly s3Client: S3Client,
    @Inject(BACKBLAZE_CONFIG) private readonly config: BackblazeConfig,
  ) {}

  async upload(params: UploadParams): Promise<UploadResult> {
    try {
      const key = `${params.destination}/${params.fileName}`;

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.config.bucketName,
          Key: key,
          Body: params.fileData, // Readable — AWS SDK Upload accepts it natively
        },
        partSize: 10 * 1024 * 1024,
        queueSize: 3,
      });

      await upload.done();

      const baseUrl =
        this.config.publicUrlBase ?? `${this.config.endpoint}/file/${this.config.bucketName}`;

      return {
        url: `${baseUrl}/${key}`,
        fileId: key,
        provider: ProviderEnum.BACKBLAZE,
        mimeType: 'application/octet-stream', // Generic fallback, B2 adapter doesn't inspect
      };
    } catch (error) {
      this.logger.error('Backblaze Upload Error:', error);
      throw new InternalServerErrorException('Failed to upload file to Backblaze.');
    }
  }

  async delete(fileId: string): Promise<DeleteResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: fileId,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted file from Backblaze: ${fileId}`);

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = isError(error) ? error.message : 'Unknown storage error';

      this.logger.error('Backblaze Delete Error:', error);

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  getMetadata(): Promise<UploadResult | null> {
    // Backblaze does not currently support rich metadata retrieval in this implementation
    return Promise.resolve(null);
  }

  generateUploadSignature(): Promise<UploadSignatureResult> {
    throw new NotImplementedException(
      'Direct signed uploads are not supported by the Backblaze provider.',
    );
  }
}
