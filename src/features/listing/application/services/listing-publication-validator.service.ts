import { Injectable, BadRequestException } from '@nestjs/common';
import { ValidateListingAttributesService } from './validate-listing-attributes.service.js';
import { Listing } from '../../domain/types/listing.entity.js';
import { IMediaRepository } from '../../../media/domain/ports/media.repository.port.js';

@Injectable()
export class ListingPublicationValidator {
  constructor(
    private readonly attributeValidator: ValidateListingAttributesService,
    private readonly mediaRepo: IMediaRepository,
  ) {}

  /**
   * Enforces all invariant rules required for a listing to be published.
   * Throws BadRequestException if any rule fails.
   */
  async validate(listing: Listing): Promise<void> {
    const errors: string[] = [];

    // 1. Description
    if (!listing.description || listing.description.trim().length < 10) {
      errors.push('Description is required and must be at least 10 characters.');
    }

    // 2. Category
    if (!listing.categoryId) {
      errors.push('A specific category is required.');
    }

    // 3. Pricing
    if (listing.price.minPrice === null && !listing.price.isNegotiable) {
      errors.push('A price must be set unless the listing is marked as negotiable.');
    }

    // 4. Category Attributes
    if (listing.categoryId) {
      try {
        await this.attributeValidator.validate(listing.categoryId, listing.attributes);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Attribute validation failed: ${msg}`);
      }
    }

    // 5. Media (Cover Photo)
    const mediaItems = await this.mediaRepo.findByOwner('listingId', listing.id);
    const hasCover = mediaItems.some((m) => m.role === 'COVER');
    if (!hasCover) {
      errors.push('A cover photo is required.');
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Cannot publish listing. Missing requirements: ${errors.join(' ')}`,
      );
    }
  }
}
