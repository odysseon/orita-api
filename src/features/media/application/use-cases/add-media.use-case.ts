import { Injectable, BadRequestException } from '@nestjs/common';
import { IMediaRepository, MediaOwnerKey } from '../../domain/ports/media.repository.port.js';
import {
  MediaRole,
  SINGLETON_ROLES,
  ROLES_BY_FK_NAME,
} from '../../domain/types/media-role.enum.js';
import { MediaType } from '../../domain/types/media-type.enum.js';
import { Media } from '../../domain/types/media.entity.js';
import { StorageProvider } from '../../../../../generated/prisma/client.js';
import { AddMediaInput as RepoAddMediaInput } from '../../domain/types/media.types.js';

export interface AddMediaInput {
  readonly ownerKey: MediaOwnerKey;
  readonly ownerId: string;
  readonly uploadIntentId?: string;
  readonly role: MediaRole;
  readonly mediaType: MediaType;

  readonly fileId: string;
  readonly provider: StorageProvider;
  readonly mimeType: string;

  readonly bytes?: number | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly duration?: number | undefined;
  readonly version?: string | undefined;
  readonly format?: string | undefined;
}

/** Max gallery items per resource — business resources allow more (curated). */
const MAX_GALLERY_ITEMS: Record<MediaOwnerKey, number> = {
  listingId: 30,
  businessProfileId: 10,
  businessTourId: 30,
  reviewId: 5,
  conversationId: 50,
  messageId: 10,
  uploadIntentId: 50,
};

export const STORAGE_DESTINATION: Record<
  MediaOwnerKey,
  (ownerId: string, role: MediaRole) => string
> = {
  businessProfileId: (id, role) =>
    role === MediaRole.LOGO
      ? `business/${id}/logo`
      : role === MediaRole.BANNER
        ? `business/${id}/banner`
        : `business/${id}/gallery`,
  listingId: (id: string) => `listings/${id}`,
  businessTourId: (id: string) => `tours/${id}`,
  reviewId: (id: string) => `reviews/${id}`,
  conversationId: (id: string) => `conversations/${id}`,
  messageId: (id: string) => `messages/${id}`,
  uploadIntentId: (id: string) => `intents/${id}`,
};

@Injectable()
export class AddMediaUseCase {
  constructor(private readonly mediaRepo: IMediaRepository) {}

  async execute(input: AddMediaInput): Promise<Media> {
    // 1. Validate role is legal for this resource owner
    const allowedRoles = ROLES_BY_FK_NAME[input.ownerKey];
    if (!allowedRoles?.has(input.role)) {
      throw new BadRequestException(
        `Role "${input.role}" is not valid for resource "${input.ownerKey}".`,
      );
    }

    const isSingleton = SINGLETON_ROLES.has(input.role);

    // 2. For GALLERY: enforce per-resource cap
    if (!isSingleton) {
      const queryOwnerKey = input.ownerKey === 'conversationId' ? 'uploadIntentId' : input.ownerKey;
      const queryOwnerId =
        input.ownerKey === 'conversationId' ? input.uploadIntentId! : input.ownerId;

      const galleryCount = await this.mediaRepo.countByRole(
        queryOwnerKey,
        queryOwnerId,
        MediaRole.GALLERY,
      );
      const cap = MAX_GALLERY_ITEMS[input.ownerKey];
      if (galleryCount >= cap) {
        throw new BadRequestException(`Maximum of ${cap} gallery items allowed per resource.`);
      }
    }

    // 3. Persist the new media record.
    //    Singletons carry no position (order = null); GALLERY appended at end.
    //    NOTE: Singleton replacement (deleting old logo) is now the responsibility of the domain orchestrator.
    const queryOwnerKey = input.ownerKey === 'conversationId' ? 'uploadIntentId' : input.ownerKey;
    const queryOwnerId =
      input.ownerKey === 'conversationId' ? input.uploadIntentId! : input.ownerId;
    const order = isSingleton
      ? null
      : await this.mediaRepo.countByRole(queryOwnerKey, queryOwnerId, MediaRole.GALLERY);

    const payload: RepoAddMediaInput = {
      fileId: input.fileId,
      provider: input.provider,
      mimeType: input.mimeType,
      mediaType: input.mediaType,
      role: input.role,
      order,
      ...(input.ownerKey === 'businessProfileId' ? { businessProfileId: input.ownerId } : {}),
      ...(input.ownerKey === 'listingId' ? { listingId: input.ownerId } : {}),
      ...(input.ownerKey === 'businessTourId' ? { businessTourId: input.ownerId } : {}),
      ...(input.ownerKey === 'reviewId' ? { reviewId: input.ownerId } : {}),
      ...(input.ownerKey === 'messageId' ? { messageId: input.ownerId } : {}),
      ...(input.ownerKey === 'conversationId' && input.uploadIntentId
        ? { uploadIntentId: input.uploadIntentId }
        : {}),
      ...(input.bytes !== undefined ? { bytes: input.bytes } : {}),
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.duration !== undefined ? { duration: input.duration } : {}),
      ...(input.version !== undefined ? { version: input.version } : {}),
      ...(input.format !== undefined ? { format: input.format } : {}),
    };

    const created = await this.mediaRepo.add(payload);

    return created;
  }
}
