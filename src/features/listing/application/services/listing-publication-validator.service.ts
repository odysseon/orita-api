import { Injectable, BadRequestException } from '@nestjs/common';
import { ValidateListingAttributesService } from './validate-listing-attributes.service.js';
import { Listing } from '../../domain/types/listing.entity.js';

@Injectable()
export class ListingPublicationValidator {
  constructor(
    private readonly attributeValidator: ValidateListingAttributesService,
  ) {}

  /**
   * Enforces all invariant rules required for a listing to be published.
   * Throws BadRequestException if any rule fails.
   */
  async validate(listing: Listing): Promise<void> {
    const errors: string[] = [];

    // Pricing
    if (listing.price.minPrice === null && !listing.price.isNegotiable) {
      errors.push('A price must be set unless the listing is marked as negotiable.');
    }

    // Category Attributes
    if (listing.categoryId) {
      try {
        await this.attributeValidator.validate(listing.categoryId, listing.attributes);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Attribute validation failed: ${msg}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Cannot publish listing. Missing requirements: ${errors.join(' ')}`,
      );
    }
  }
}
