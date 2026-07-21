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
  SignatureConstraints,
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
          const cloudinaryResult = result as unknown as {
            secure_url: string;
            public_id: string;
            resource_type: string;
            format?: string;
            bytes?: number;
            width?: number;
            height?: number;
            duration?: number;
            version?: string | number;
          };
          resolve({
            url: cloudinaryResult.secure_url,
            fileId: cloudinaryResult.public_id,
            provider: ProviderEnum.CLOUDINARY,
            mimeType: `${cloudinaryResult.resource_type}/${cloudinaryResult.format || 'unknown'}`,
            ...(cloudinaryResult.bytes !== undefined ? { bytes: cloudinaryResult.bytes } : {}),
            ...(cloudinaryResult.width !== undefined ? { width: cloudinaryResult.width } : {}),
            ...(cloudinaryResult.height !== undefined ? { height: cloudinaryResult.height } : {}),
            ...(cloudinaryResult.duration !== undefined
              ? { duration: cloudinaryResult.duration }
              : {}),
            ...(cloudinaryResult.version !== undefined
              ? { version: String(cloudinaryResult.version) }
              : {}),
            ...(cloudinaryResult.format !== undefined ? { format: cloudinaryResult.format } : {}),
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
      const result = (await this.cloudinary.api.resource(fileId)) as unknown;
      const cloudinaryResult = result as {
        secure_url: string;
        public_id: string;
        resource_type: string;
        format?: string;
        bytes?: number;
        width?: number;
        height?: number;
        duration?: number;
        version?: string | number;
      };

      return {
        url: cloudinaryResult.secure_url,
        fileId: cloudinaryResult.public_id,
        provider: ProviderEnum.CLOUDINARY,
        mimeType: `${cloudinaryResult.resource_type}/${cloudinaryResult.format || 'unknown'}`,
        ...(cloudinaryResult.bytes !== undefined ? { bytes: cloudinaryResult.bytes } : {}),
        ...(cloudinaryResult.width !== undefined ? { width: cloudinaryResult.width } : {}),
        ...(cloudinaryResult.height !== undefined ? { height: cloudinaryResult.height } : {}),
        ...(cloudinaryResult.duration !== undefined ? { duration: cloudinaryResult.duration } : {}),
        ...(cloudinaryResult.version !== undefined
          ? { version: String(cloudinaryResult.version) }
          : {}),
        ...(cloudinaryResult.format !== undefined ? { format: cloudinaryResult.format } : {}),
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

  generateUploadSignature(
    folder: string,
    publicId: string,
    timestamp: number,
    constraints?: SignatureConstraints,
  ): Promise<UploadSignatureResult> {
    const apiSecret = this.cloudinary.config().api_secret;
    const apiKey = this.cloudinary.config().api_key;
    const cloudName = this.cloudinary.config().cloud_name;

    if (!apiSecret || !apiKey || !cloudName) {
      throw new InternalServerErrorException('Cloudinary configuration is incomplete.');
    }

    const signatureParams: Record<string, unknown> = {
      folder,
      public_id: publicId,
      timestamp,
    };

    // Note: Cloudinary's direct API restricts client_allowed_formats (for widget)
    // For direct API requests, `allowed_formats` can be used to restrict extensions.
    if (constraints?.allowedFormats) {
      signatureParams['allowed_formats'] = constraints.allowedFormats.join(',');
    }
    // Note: Cloudinary does not natively support an explicit `max_file_size`
    // signed parameter via the basic upload API, but we can set it in upload presets.
    // However, we include it here just in case, but rely heavily on backend validation.
    // We could use `upload_preset` if we created them dynamically.
    // For safety, we will let it just pass through if not natively supported,
    // since backend validation will delete it anyway.

    const signature = this.cloudinary.utils.api_sign_request(signatureParams, apiSecret);

    return Promise.resolve({
      signature,
      timestamp,
      apiKey,
      cloudName,
    });
  }
}
