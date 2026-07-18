import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ListingStatus } from '../../domain/types/listing-status.enum.js';
import { Listing } from '../../domain/types/listing.entity.js';
import { ListingSummary, PaginatedListingSummaries } from '../../domain/types/listing.types.js';

export class ListingResponseDto {
  id: string;
  businessProfileId: string;
  @ApiPropertyOptional() businessProfileSlug?: string;
  title: string;
  slug: string;
  description: string | null;
  status: ListingStatus;
  minPrice: string | null;
  maxPrice: string | null;
  currencyCode: string | null;
  isNegotiable: boolean;
  @ApiPropertyOptional({ nullable: true }) categoryId: string | null;
  @ApiPropertyOptional() attributes: Record<string, unknown> | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
  @ApiPropertyOptional() coverUrl?: string;
  @ApiPropertyOptional() galleryUrls?: string[];
  @ApiPropertyOptional() reviews?: unknown[];
  @ApiPropertyOptional() isSaved?: boolean;

  private constructor(listing: Listing & { isSaved?: boolean; businessProfileSlug?: string }) {
    this.id = listing.id;
    this.businessProfileId = listing.businessProfileId;
    if (listing.businessProfileSlug) {
      this.businessProfileSlug = listing.businessProfileSlug;
    }
    this.title = listing.title;
    this.slug = listing.slug;
    this.description = listing.description;
    this.status = listing.status;
    this.minPrice = listing.price.minPrice?.toString() ?? null;
    this.maxPrice = listing.price.maxPrice?.toString() ?? null;
    this.currencyCode = listing.price.currencyCode;
    this.isNegotiable = listing.price.isNegotiable;
    this.categoryId = listing.categoryId;
    this.attributes = listing.attributes;
    this.createdAt = new Date(listing.createdAt).toISOString();
    this.updatedAt = new Date(listing.updatedAt).toISOString();
    if (listing.reviews !== undefined) {
      this.reviews = listing.reviews.map((r) => ({
        ...r,
        createdAt: new Date(r.createdAt).toISOString(),
      }));
    }
    if (listing.isSaved !== undefined) {
      this.isSaved = listing.isSaved;
    }
    if (listing.coverUrl !== undefined) {
      this.coverUrl = listing.coverUrl;
    }
    if (listing.galleryUrls !== undefined) {
      this.galleryUrls = listing.galleryUrls;
    }
  }

  static from(
    listing: Listing & { isSaved?: boolean; businessProfileSlug?: string },
  ): ListingResponseDto {
    return new ListingResponseDto(listing);
  }
}

export class ListingSummaryResponseDto {
  id: string;
  businessProfileId: string;
  businessProfileSlug?: string;
  title: string;
  slug: string;
  description: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  currencyCode: string | null;
  categoryId: string | null;
  isNegotiable: boolean;
  @ApiPropertyOptional() coverUrl?: string;
  @ApiPropertyOptional() attributes?: Record<string, unknown> | null;
  @ApiPropertyOptional() isSaved?: boolean;

  private constructor(summary: ListingSummary & { isSaved?: boolean }) {
    this.id = summary.id;
    this.businessProfileId = summary.businessProfileId;
    if (summary.businessProfileSlug !== undefined) {
      this.businessProfileSlug = summary.businessProfileSlug;
    }
    this.title = summary.title;
    this.slug = summary.slug;
    this.description = summary.description;
    this.minPrice = summary.minPrice?.toString() ?? null;
    this.maxPrice = summary.maxPrice?.toString() ?? null;
    this.currencyCode = summary.currencyCode;
    this.categoryId = summary.categoryId;
    this.isNegotiable = summary.isNegotiable;
    if (summary.coverUrl !== undefined) {
      this.coverUrl = summary.coverUrl;
    }
    if (summary.attributes !== undefined) {
      this.attributes = summary.attributes;
    }
    if (summary.isSaved !== undefined) {
      this.isSaved = summary.isSaved;
    }
  }

  static from(summary: ListingSummary & { isSaved?: boolean }): ListingSummaryResponseDto {
    return new ListingSummaryResponseDto(summary);
  }
}

export class PaginatedListingsResponseDto {
  items: ListingSummaryResponseDto[];
  total: number;
  page: number;
  limit: number;

  private constructor(paginated: PaginatedListingSummaries) {
    this.items = paginated.items.map((s) => ListingSummaryResponseDto.from(s));
    this.total = paginated.total;
    this.page = paginated.page;
    this.limit = paginated.limit;
  }

  static from(paginated: PaginatedListingSummaries): PaginatedListingsResponseDto {
    return new PaginatedListingsResponseDto(paginated);
  }
}
