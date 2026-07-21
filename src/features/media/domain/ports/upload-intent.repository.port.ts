import {
  MediaRole,
  StorageProvider,
  UploadOwnerType,
} from '../../../../../generated/prisma/client.js';
import { UploadIntent } from '../types/upload-intent.entity.js';

export interface CreateUploadIntentInput {
  ownerType: UploadOwnerType;
  ownerId: string;
  role: MediaRole;
  provider: StorageProvider;
  folder: string;
  publicId: string;
  createdById: string;
  expiresAt: Date;
}

export abstract class IUploadIntentRepository {
  /**
   * Creates a new upload intent record.
   */
  abstract create(input: CreateUploadIntentInput): Promise<UploadIntent>;

  /**
   * Retrieves an upload intent by its ID.
   */
  abstract findById(intentId: string): Promise<UploadIntent | null>;

  /**
   * Marks an upload intent as consumed.
   */
  abstract markConsumed(intentId: string): Promise<void>;

  /**
   * Counts active upload intents for a given user.
   */
  abstract countActiveByUserId(userId: string): Promise<number>;
}
