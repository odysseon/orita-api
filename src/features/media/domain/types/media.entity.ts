import { MediaRole } from './media-role.enum.js';
import { MediaType } from './media-type.enum.js';

/**
 * A Media item represents a single uploadable asset attached to a resource.
 *
 * Design: polymorphic — one model serves all resource types.
 * Currently supports: LISTING, BUSINESS_PROFILE
 *
 * role captures the semantic purpose of the media item:
 *   - LOGO / BANNER → BusinessProfile singletons (order = null)
 *   - COVER         → Listing singleton (order = null)
 *   - GALLERY       → Reorderable multi-items (order = 0-based integer)
 *
 * Media is NOT:
 *   - a CDN configuration
 *   - a media processing pipeline
 *   - a standalone asset library
 *
 * It is an attachment surface for commercial resources.
 */
export interface Media {
  readonly id: string;

  /** Specific resource owners */
  readonly businessProfileId: string | null;
  readonly listingId: string | null;
  readonly businessTourId: string | null;
  readonly reviewId: string | null;
  readonly messageId?: string | null;
  readonly uploadIntentId?: string | null;

  /** Delivery URL */
  readonly url: string;

  /** Storage management ID — used for deletion */
  readonly fileId: string;

  readonly mediaType: MediaType;

  /**
   * Semantic role of this media item within its resource.
   * Determines cardinality rules and display context.
   */
  readonly role: MediaRole;

  /**
   * Display sequence — only meaningful for GALLERY role items.
   * null for singleton roles (LOGO, BANNER, COVER).
   * Always contiguous — renormalized after add, delete, or reorder.
   */
  readonly order: number | null;

  readonly createdAt: Date;
}
