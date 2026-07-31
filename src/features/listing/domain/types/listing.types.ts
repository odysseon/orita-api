import { ListingStatus } from './listing-status.enum.js';
import { ListingAvailability } from './listing-availability.enum.js';
import { ServiceAreaInput } from '../../../business-profile/domain/types/business-profile.types.js';

// ---------------------------------------------------------------------------
// Price input
// ---------------------------------------------------------------------------

export interface ListingPriceInput {
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly currencyCode?: string;
  readonly isNegotiable: boolean;
}

// ---------------------------------------------------------------------------
// Use case inputs
// ---------------------------------------------------------------------------

/**
 * Input to create a new listing.
 * Slug is derived from title by the use case — not provided by the caller.
 * Status defaults to DRAFT.
 */
export interface CreateListingInput {
  readonly ownerId: string;
  readonly title: string;
  readonly categoryId: string;
  readonly description?: string;
  readonly price?: ListingPriceInput;
  readonly availability?: ListingAvailability;
  readonly attributes?: Record<string, unknown>;
  readonly serviceAreas?: ServiceAreaInput[];
}

/**
 * Input to update an existing listing.
 * All fields optional — callers supply only what changes.
 * businessProfileId and slug are not updatable.
 */
export interface UpdateListingInput {
  readonly title?: string;
  readonly categoryId?: string;
  readonly description?: string;
  readonly price?: ListingPriceInput;
  readonly availability?: ListingAvailability;
  readonly attributes?: Record<string, unknown>;
  readonly serviceAreas?: ServiceAreaInput[];
}

/**
 * Input to transition listing lifecycle state.
 * Separated from UpdateListingInput because status transitions
 * have their own rules and will eventually carry validation logic.
 */
export interface TransitionListingStatusInput {
  readonly status: ListingStatus;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/**
 * Full listing representation.
 * Used for owner-facing detail views.
 */
export interface ListingView {
  readonly id: string;
  readonly businessProfileId: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string | null;
  readonly status: ListingStatus;
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
  readonly currencyCode: string | null;
  readonly categoryId: string | null;
  readonly attributes: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly reviews?: {
    readonly id: string;
    readonly reviewerId: string;
    readonly rating: number;
    readonly comment: string | null;
    readonly createdAt: Date;
  }[];
}

/**
 * Lightweight summary for discovery surfaces.
 * Intentionally minimal — enough to render a listing card.
 */
export interface ListingSummary {
  readonly id: string;
  readonly businessProfileId: string;
  readonly businessProfileSlug?: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string | null;
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
  readonly currencyCode: string | null;
  readonly isNegotiable: boolean;
  readonly availability: ListingAvailability;
  readonly categoryId: string | null;
  readonly coverUrl?: string;
  readonly attributes?: Record<string, unknown> | null;
  readonly isSaved?: boolean;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export interface DiscoverListingsInput {
  readonly businessProfileId?: string;
  readonly currencyCode?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly isNegotiable?: boolean;
  readonly search?: string;
  readonly status?: ListingStatus;
  /** Filter by category slug (exact or parent slug) */
  readonly categorySlug?: string;
  readonly attributes?: Record<string, unknown>;
  readonly lat?: number;
  readonly lng?: number;
  readonly radiusInKm?: number;
  readonly currentUserId?: string;
  readonly page: number;
  readonly limit: number;
}

export interface PaginatedListingSummaries {
  readonly items: ListingSummary[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}
