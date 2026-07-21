import { Listing } from '../types/listing.entity.js';
import {
  CreateListingInput,
  DiscoverListingsInput,
  PaginatedListingSummaries,
  TransitionListingStatusInput,
  UpdateListingInput,
} from '../types/listing.types.js';

/**
 * Port: persistence contract for listings.
 *
 * Defined in Zone 0 (domain).
 * Implemented in Zone 3 (infrastructure — Prisma adapter).
 *
 * Abstract class so it survives TypeScript erasure
 * and serves as a NestJS injection token directly.
 */
export abstract class IListingRepository {
  abstract create(
    businessProfileId: string,
    input: CreateListingInput,
    slug: string,
  ): Promise<Listing>;

  abstract findById(id: string): Promise<Listing | null>;

  abstract findBySlug(slug: string): Promise<Listing | null>;

  /**
   * Check whether a slug is already taken within a business profile.
   * Slug uniqueness is scoped to the business profile, not global.
   */
  abstract isSlugTaken(businessProfileId: string, slug: string): Promise<boolean>;

  /**
   * Return all listings owned by a business profile.
   * Owner-facing — returns all statuses.
   */
  abstract findByBusinessProfile(businessProfileId: string): Promise<Listing[]>;

  /**
   * Apply safe field updates.
   * Does not touch status, businessProfileId, or slug.
   */
  abstract update(id: string, input: UpdateListingInput): Promise<Listing>;

  /**
   * Transition lifecycle state.
   * Separated from update() — status transitions carry their own rules.
   */
  abstract transitionStatus(id: string, input: TransitionListingStatusInput): Promise<Listing>;

  abstract delete(id: string): Promise<void>;

  /**
   * Public discovery query.
   * By default returns only PUBLISHED listings.
   * Supports pagination, filtering by price, currency, negotiability, and search.
   */
  abstract discover(input: DiscoverListingsInput): Promise<PaginatedListingSummaries>;
}
