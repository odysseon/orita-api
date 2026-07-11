import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as Cloudinary } from 'cloudinary';

import { isError } from '../../../shared/utils/error.util.js';
import * as path from 'path';
import { CLOUDINARY } from './cloudinary.provider.js';
import {
  StorageProvider,
  UploadParams,
  UploadResult,
  DeleteResult,
  UploadSignatureResult,
} from '../../ports/provider.port.js';
import { StorageProvider as ProviderEnum } from '../../../../generated/prisma/client.js';

@Injectable()
export class CloudinaryStorageProvider implements StorageProvider {
  private readonly logger = new Logger(CloudinaryStorageProvider.name);

  constructor(@Inject(CLOUDINARY) private readonly cloudinary: typeof Cloudinary) {}

  async upload(params: UploadParams): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const publicIdBase = path.parse(params.fileName).name;

      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          public_id: publicIdBase,
          folder: params.destination,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Cloudinary Upload Callback Error:', error);
            return reject(new InternalServerErrorException('Failed to upload image.'));
          }

          this.logger.log(`Uploaded image to Cloudinary: ${result.public_id}`);
          resolve({
            url: result.secure_url,
            fileId: result.public_id,
            provider: ProviderEnum.CLOUDINARY,
            mimeType: `${result.resource_type}/${result.format}`,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            duration: result['duration'],
            version: String(result.version),
            format: result.format,
          });
        },
      );

      const readStream = params.fileData;

      // Handle incoming stream errors (e.g., client aborts upload halfway)
      readStream.once('error', (err) => {
        this.logger.error('Incoming read stream error:', err);
        uploadStream.destroy();
        reject(new InternalServerErrorException('Failed to read incoming file stream.'));
      });

      // Handle outgoing stream errors (e.g., Cloudinary API drops connection)
      uploadStream.once('error', (err) => {
        this.logger.error('Cloudinary pipe stream error:', err);
        readStream.destroy();
        reject(new InternalServerErrorException('Failed to pipe image to Cloudinary.'));
      });

      readStream.pipe(uploadStream);
    });
  }

  async delete(fileId: string): Promise<DeleteResult> {
    try {
      await this.cloudinary.uploader.destroy(fileId);
      this.logger.log(`Deleted image from Cloudinary: ${fileId}`);

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = isError(error) ? error.message : 'Unknown storage error';

      this.logger.error('Cloudinary Delete Error:', error);

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async getMetadata(fileId: string): Promise<UploadResult | null> {
    try {
      const result = await this.cloudinary.api.resource(fileId);
      return {
        url: result.secure_url,
        fileId: result.public_id,
        provider: ProviderEnum.CLOUDINARY,
        mimeType: `${result.resource_type}/${result.format}`,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration,
        version: String(result.version),
        format: result.format,
      };
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown>;
      if (
        errorObj &&
        typeof errorObj === 'object' &&
        errorObj['error'] &&
        typeof errorObj['error'] === 'object' &&
        (errorObj['error'] as Record<string, unknown>)['http_code'] === 404
      ) {
        return null;
      }
      throw err;
    }
  }

  async generateUploadSignature(folder: string, publicId: string, timestamp: number): Promise<UploadSignatureResult> {
    const apiSecret = this.cloudinary.config().api_secret;
    const apiKey = this.cloudinary.config().api_key;
    const cloudName = this.cloudinary.config().cloud_name;

    if (!apiSecret || !apiKey || !cloudName) {
      throw new InternalServerErrorException('Cloudinary configuration is incomplete.');
    }

    const signature = this.cloudinary.utils.api_sign_request(
      {
        folder,
        public_id: publicId,
        timestamp,
      },
      apiSecret
    );

    return {
      signature,
      timestamp,
      apiKey,
      cloudName,
    };
  }
}
