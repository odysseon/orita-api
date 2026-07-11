import { MediaRole } from './media-role.enum.js';
import { MediaType } from './media-type.enum.js';
import { StorageProvider } from '../../../../../generated/prisma/client.js';

export interface AddMediaInput {
  readonly businessProfileId?: string;
  readonly listingId?: string;
  readonly businessTourId?: string;
  readonly reviewId?: string;
  readonly fileId: string;
  readonly mediaType: MediaType;
  readonly role: MediaRole;
  /** Assigned by use case after normalization — not provided by caller */
  readonly order: number | null;

  // New metadata fields
  readonly provider: StorageProvider;
  readonly mimeType: string;
  readonly bytes?: number;
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
  readonly version?: string;
  readonly format?: string;
}

export interface ReorderMediaInput {
  /** Ordered array of media IDs representing the desired sequence */
  readonly orderedIds: string[];
}

export interface MediaView {
  readonly id: string;
  readonly businessProfileId: string | null;
  readonly listingId: string | null;
  readonly businessTourId: string | null;
  readonly reviewId: string | null;
  readonly url: string;
  readonly mediaType: MediaType;
  readonly role: MediaRole;
  readonly order: number | null;
  readonly createdAt: Date;
}
