import {
  MediaRole,
  StorageProvider,
  UploadOwnerType,
} from '../../../../../generated/prisma/client.js';

export interface UploadIntent {
  readonly id: string;
  readonly ownerType: UploadOwnerType;
  readonly ownerId: string;
  readonly role: MediaRole;
  readonly provider: StorageProvider;
  readonly folder: string;
  readonly publicId: string;
  readonly createdById: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly consumedAt: Date | null;
}
