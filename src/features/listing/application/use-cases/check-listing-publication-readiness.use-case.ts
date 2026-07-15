import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IListingRepository } from '../../domain/ports/listing.repository.port.js';
import { IBusinessProfileRepository } from '../../../business-profile/domain/ports/business-profile.repository.port.js';
import { ListingPublicationPolicy } from '../../domain/policies/listing-publication.policy.js';
import { ListingPublicationValidator } from '../services/listing-publication-validator.service.js';
import { PublicationIssue, PublicationIssueCode, PublicationReadinessResult } from '../../../../shared/domain/publication.types.js';

@Injectable()
export class CheckListingPublicationReadinessUseCase {
  constructor(
    private readonly listingRepo: IListingRepository,
    private readonly businessRepo: IBusinessProfileRepository,
    private readonly publicationValidator: ListingPublicationValidator,
  ) {}

  async execute(id: string, requesterId: string): Promise<PublicationReadinessResult> {
    const listing = await this.listingRepo.findById(id);

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const parentBusiness = await this.businessRepo.findById(listing.businessProfileId);

    if (!parentBusiness) {
      throw new NotFoundException('Parent business profile not found.');
    }

    if (parentBusiness.ownerId !== requesterId) {
      throw new ForbiddenException('You do not own this listing.');
    }

    const validationResult = ListingPublicationPolicy.validate(listing, parentBusiness);
    const issues: PublicationIssue[] = [...validationResult.issues];

    try {
      await this.publicationValidator.validate(listing);
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        // the validator throws BadRequestException with a message joining all errors
        // for better UX, we'll just add a generic error with the message
        const response: any = err.getResponse();
        const msg = typeof response === 'string' ? response : (response.message || 'Validation failed');
        
        issues.push({
          code: PublicationIssueCode.LISTING_ATTRIBUTE_VALIDATION_FAILED,
          severity: 'ERROR',
          message: Array.isArray(msg) ? msg.join(', ') : msg,
        });
      } else {
        issues.push({
          code: PublicationIssueCode.LISTING_ATTRIBUTE_VALIDATION_FAILED,
          severity: 'ERROR',
          message: 'An unknown validation error occurred.',
        });
      }
    }

    const hasErrors = issues.some(i => i.severity === 'ERROR');

    return {
      ready: !hasErrors,
      issues,
    };
  }
}
