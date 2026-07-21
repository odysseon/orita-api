import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { IUploadIntentRepository } from '../../domain/ports/upload-intent.repository.port.js';
import { MediaStorageService } from '../../../../storage/media-storage.service.js';
import { MediaOwnerKey } from '../../domain/ports/media.repository.port.js';
import { AddMediaUseCase } from './add-media.use-case.js';
import { Media } from '../../domain/types/media.entity.js';
import { MEDIA_CONSTRAINTS } from '../../domain/policies/media-constraints.policy.js';

export interface ConsumeUploadIntentInput {
  intentId: string;
  publicId: string;
  version: string;
  ownerKey: MediaOwnerKey;
  ownerId: string;
  requesterId: string;
}

@Injectable()
export class ConsumeUploadIntentUseCase {
  constructor(
    private readonly intentRepo: IUploadIntentRepository,
    private readonly storage: MediaStorageService,
    private readonly addMedia: AddMediaUseCase,
  ) {}

  async execute(input: ConsumeUploadIntentInput): Promise<Media> {
    // 1. Look up the intent
    const intent = await this.intentRepo.findById(input.intentId);
    if (!intent) {
      throw new NotFoundException(`Upload intent ${input.intentId} not found.`);
    }

    // 2. Authorize & Validate Intent state
    if (intent.createdById !== input.requesterId) {
      throw new BadRequestException('You are not authorized to consume this upload intent.');
    }
    if (intent.ownerId !== input.ownerId) {
      throw new BadRequestException('Upload intent does not belong to this resource.');
    }
    const expectedFullPublicId = `${intent.folder}/${intent.publicId}`;
    if (expectedFullPublicId !== input.publicId) {
      throw new BadRequestException('Public ID does not match the authorized intent.');
    }
    if (intent.consumedAt) {
      throw new BadRequestException('Upload intent has already been consumed.');
    }
    if (new Date() > intent.expiresAt) {
      throw new BadRequestException('Upload intent has expired.');
    }

    // 3. Fetch authoritative metadata from Cloudinary
    const metadata = await this.storage.getMetadata(input.publicId);
    if (!metadata) {
      throw new BadRequestException(
        'Media asset not found in storage provider. Did the upload complete?',
      );
    }

    // 4. Validate metadata matches expectations
    if (!metadata.fileId.startsWith(intent.folder)) {
      throw new BadRequestException('Asset was uploaded to the wrong folder.');
    }

    const policy = MEDIA_CONSTRAINTS[intent.role];

    const cleanUpAndThrow = async (message: string) => {
      await this.storage.deleteMedia(metadata.fileId).catch(() => {}); // fire and forget cleanup
      throw new BadRequestException(message);
    };

    // 4a. Validate size
    if (metadata.bytes && metadata.bytes > policy.maxSizeBytes) {
      await cleanUpAndThrow(`Asset size exceeds maximum allowed (${policy.maxSizeBytes} bytes).`);
    }

    // 4b. Validate format
    if (metadata.format && !policy.allowedFormats.includes(metadata.format.toLowerCase())) {
      await cleanUpAndThrow(`Asset format '${metadata.format}' is not allowed.`);
    }

    // 4c. Validate resource type (image vs video)
    const resourceType = metadata.mimeType.split('/')[0] as 'image' | 'video';
    if (!policy.allowedResourceTypes.includes(resourceType)) {
      await cleanUpAndThrow(`Asset type '${resourceType}' is not allowed.`);
    }

    // 4d. Validate dimensions
    if (resourceType === 'image' || resourceType === 'video') {
      if (policy.maxWidth && metadata.width && metadata.width > policy.maxWidth) {
        await cleanUpAndThrow(`Asset width exceeds maximum allowed (${policy.maxWidth}px).`);
      }
      if (policy.maxHeight && metadata.height && metadata.height > policy.maxHeight) {
        await cleanUpAndThrow(`Asset height exceeds maximum allowed (${policy.maxHeight}px).`);
      }
    }

    // 4e. Validate duration
    if (resourceType === 'video') {
      if (
        policy.maxDurationSeconds &&
        metadata.duration &&
        metadata.duration > policy.maxDurationSeconds
      ) {
        await cleanUpAndThrow(
          `Video duration exceeds maximum allowed (${policy.maxDurationSeconds}s).`,
        );
      }
    }

    // (Assuming upload time is checked loosely, or we trust Cloudinary metadata)

    // 5. Consume Intent
    await this.intentRepo.markConsumed(intent.id);

    // 6. Persist Media Record
    return this.addMedia.execute({
      ownerKey: input.ownerKey,
      ownerId: input.ownerId,
      uploadIntentId: intent.id,
      role: intent.role,
      mediaType: metadata.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      fileId: metadata.fileId,
      provider: metadata.provider,
      mimeType: metadata.mimeType,
      bytes: metadata.bytes,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      version: metadata.version || input.version,
      format: metadata.format,
    });
  }
}
