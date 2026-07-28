import { ListingPrice } from './listing-price.value-object.js';
import { ListingStatus } from './listing-status.enum.js';
import { ListingAvailability } from './listing-availability.enum.js';

/**
 * A Listing represents a public commercial offering exposed by a business profile.
 *
 * It is intentionally broad to support:
 *   - physical products
 *   - services
 *   - logistics offers
 *   - procurement offers
 *   - distribution offers
 *
 * without hardcoding domain logic for each category.
 *
 * A Listing IS:
 *   - a discoverable commercial presentation
 *   - a visibility surface owned by a business profile
 *   - a trust and discovery artifact
 *
 * A Listing is NOT:
 *   - an inventory unit (no stock tracking)
 *   - a transactional record (no order lifecycle)
 *   - a fulfillment entity (no dispatch, routing, delivery)
 *   - a cart item (no quantity management)
 *   - a contract (no binding commercial obligation)
 */
export interface Listing {
  readonly id: string;

  /**
   * The business profile that owns and publishes this listing.
   * Listings cannot exist without a parent business profile.
   */
  readonly businessProfileId: string;

  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  readonly title: string;
  readonly slug: string;
  readonly description: string | null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  //
  // DRAFT     — created but not yet visible publicly
  // PUBLISHED — visible in discovery
  // PAUSED    — temporarily hidden by owner, intent to re-activate
  // ARCHIVED  — retired, no longer active, invisible publicly
  //             still queryable by owner for record keeping
  // ---------------------------------------------------------------------------

  readonly status: ListingStatus;
  readonly availability: ListingAvailability;

  // ---------------------------------------------------------------------------
  // Category
  // ---------------------------------------------------------------------------

  readonly categoryId: string | null;

  // ---------------------------------------------------------------------------
  // Dynamic Attributes
  // ---------------------------------------------------------------------------

  readonly attributes: Record<string, unknown> | null;

  // ---------------------------------------------------------------------------
  // Price signal
  //
  // Stored in smallest currency unit to avoid floating point errors.
  // (kobo for NGN, cents for USD/GBP/EUR)
  // ---------------------------------------------------------------------------

  readonly price: ListingPrice;

  // ---------------------------------------------------------------------------
  // Timestamps
  // ---------------------------------------------------------------------------

  readonly createdAt: Date;
  readonly updatedAt: Date;

  readonly coverUrl?: string;
  readonly galleryUrls?: string[];

  readonly reviews?: {
    readonly id: string;
    readonly reviewerId: string;
    readonly rating: number;
    readonly comment: string | null;
    readonly createdAt: Date;
  }[];
}
