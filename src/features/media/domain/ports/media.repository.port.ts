import { Media } from '../types/media.entity.js';
import { AddMediaInput, ReorderMediaInput } from '../types/media.types.js';
import { MediaRole } from '../types/media-role.enum.js';

export type MediaOwnerKey = 'businessProfileId' | 'listingId' | 'businessTourId' | 'reviewId' | 'conversationId' | 'messageId' | 'uploadIntentId';

export abstract class IMediaRepository {
  abstract add(input: AddMediaInput): Promise<Media>;

  /**
   * Return all media for a resource, ordered by role then order ASC.
   */
  abstract findByOwner(ownerKey: MediaOwnerKey, ownerId: string): Promise<Media[]>;

  abstract findById(id: string): Promise<Media | null>;

  /**
   * Return all media for a resource matching a specific role.
   * For singleton roles (LOGO, BANNER, COVER) this returns 0 or 1 items.
   * For GALLERY this returns all gallery items ordered by order ASC.
   */
  abstract findByRole(ownerKey: MediaOwnerKey, ownerId: string, role: MediaRole): Promise<Media[]>;

  /**
   * Reorder GALLERY items for a resource.
   * Receives the full desired sequence as an ordered array of IDs.
   * Persists contiguous 0-based order values matching the array position.
   */
  abstract reorder(
    ownerKey: MediaOwnerKey,
    ownerId: string,
    input: ReorderMediaInput,
  ): Promise<Media[]>;

  /**
   * Delete a single media item.
   * Caller is responsible for renormalizing GALLERY order after deletion.
   */
  abstract delete(id: string): Promise<void>;

  /**
   * Renormalize order values for GALLERY items in a resource to be contiguous from 0.
   * Called after a GALLERY item is deleted to close gaps.
   */
  abstract renormalize(ownerKey: MediaOwnerKey, ownerId: string): Promise<void>;

  /**
   * Attach a set of media items to a message.
   * Also clears their uploadIntentId since they are now permanently owned by the message.
   */
  abstract attachToMessage(mediaIds: string[], messageId: string): Promise<void>;

  /**
   * Count total media items for a resource.
   * Used to enforce the overall per-resource media cap at the application layer.
   */
  abstract countByOwner(ownerKey: MediaOwnerKey, ownerId: string): Promise<number>;

  /**
   * Count media items for a specific role within a resource.
   * Used to enforce singleton and per-role cardinality at the application layer.
   */
  abstract countByRole(ownerKey: MediaOwnerKey, ownerId: string, role: MediaRole): Promise<number>;
}
