import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  MediaRole,
  StorageProvider,
  UploadOwnerType,
} from '../../../../../generated/prisma/client.js';
import { IUploadIntentRepository } from '../../domain/ports/upload-intent.repository.port.js';
import { MediaStorageService } from '../../../../storage/media-storage.service.js';
import { UploadSignatureResult } from '../../../../storage/ports/provider.port.js';
import { STORAGE_DESTINATION } from './add-media.use-case.js';
import { ROLES_BY_FK_NAME } from '../../domain/types/media-role.enum.js';
import { MediaOwnerKey } from '../../domain/ports/media.repository.port.js';

export interface GenerateUploadIntentInput {
  ownerKey: MediaOwnerKey;
  ownerId: string;
  role: MediaRole;
  createdById: string;
}

export interface GenerateUploadIntentResult extends UploadSignatureResult {
  intentId: string;
  folder: string;
  publicId: string;
}

const OWNER_KEY_TO_TYPE: Record<MediaOwnerKey, UploadOwnerType> = {
  businessProfileId: UploadOwnerType.BUSINESS_PROFILE,
  listingId: UploadOwnerType.LISTING,
  businessTourId: UploadOwnerType.BUSINESS_TOUR,
  reviewId: UploadOwnerType.REVIEW,
};

@Injectable()
export class GenerateUploadIntentUseCase {
  constructor(
    private readonly intentRepo: IUploadIntentRepository,
    private readonly storage: MediaStorageService,
  ) {}

  async execute(input: GenerateUploadIntentInput): Promise<GenerateUploadIntentResult> {
    // 1. Validate role is legal for this resource owner
    const allowedRoles = ROLES_BY_FK_NAME[input.ownerKey];
    if (!allowedRoles?.has(input.role)) {
      throw new BadRequestException(
        `Role "${input.role}" is not valid for resource "${input.ownerKey}".`,
      );
    }

    // 2. Compute semantic folder and publicId
    const folder = STORAGE_DESTINATION[input.ownerKey](input.ownerId, input.role);
    const publicId = `${folder}/media_${uuidv4()}`;
    const timestamp = Math.round(new Date().getTime() / 1000);

    // 3. Generate Cloudinary signature (assuming Cloudinary is active provider)
    // In the future, if we use another provider, we might need a factory or check.
    const signatureResult = await this.storage.generateUploadSignature(folder, publicId, timestamp);

    // 4. Create and persist UploadIntent
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const intent = await this.intentRepo.create({
      ownerType: OWNER_KEY_TO_TYPE[input.ownerKey],
      ownerId: input.ownerId,
      role: input.role,
      provider: StorageProvider.CLOUDINARY, // For now, hardcoded as it's the direct upload provider
      folder,
      publicId,
      createdById: input.createdById,
      expiresAt,
    });

    return {
      ...signatureResult,
      intentId: intent.id,
      folder,
      publicId,
    };
  }
}
