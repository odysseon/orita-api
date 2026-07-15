import {
  PublicationIssue,
  PublicationIssueCode,
  PublicationResult,
  PublicationRule,
} from '../../../../shared/domain/publication.types.js';
import { Listing } from '../types/listing.entity.js';
import { BusinessProfileView } from '../../../business-profile/domain/types/business-profile.types.js';

export class ParentBusinessRule implements PublicationRule<Listing, BusinessProfileView> {
  evaluate(_listing: Listing, parentBusiness: BusinessProfileView): PublicationIssue[] {
    const issues: PublicationIssue[] = [];
    if (!parentBusiness.isPublic) {
      issues.push({
        code: PublicationIssueCode.PARENT_BUSINESS_PRIVATE,
        severity: 'ERROR',
        message: 'Parent business must be public before publishing a listing.',
      });
    }
    if (
      !parentBusiness.contactEmail &&
      !parentBusiness.contactPhone &&
      !parentBusiness.whatsapp
    ) {
      issues.push({
        code: PublicationIssueCode.PARENT_BUSINESS_NO_CONTACT,
        severity: 'ERROR',
        message: 'Parent business must have at least one contact method.',
      });
    }
    return issues;
  }
}

export class ListingDescriptionRule implements PublicationRule<Listing, BusinessProfileView> {
  evaluate(listing: Listing): PublicationIssue[] {
    if (!listing.description?.trim()) {
      return [
        {
          code: PublicationIssueCode.LISTING_DESCRIPTION_REQUIRED,
          severity: 'ERROR',
          message: 'A listing description is required.',
        },
      ];
    }
    return [];
  }
}

export class ListingCategoryRule implements PublicationRule<Listing, BusinessProfileView> {
  evaluate(listing: Listing): PublicationIssue[] {
    if (!listing.categoryId) {
      return [
        {
          code: PublicationIssueCode.CATEGORY_REQUIRED,
          severity: 'ERROR',
          message: 'A category must be selected.',
        },
      ];
    }
    return [];
  }
}

export class ListingCoverPhotoRule implements PublicationRule<Listing, BusinessProfileView> {
  evaluate(listing: Listing): PublicationIssue[] {
    if (!listing.coverUrl) {
      return [
        {
          code: PublicationIssueCode.LISTING_COVER_REQUIRED,
          severity: 'ERROR',
          message: 'A listing cover photo is required.',
        },
      ];
    }
    return [];
  }
}

export class ListingPublicationPolicy {
  private static rules: PublicationRule<Listing, BusinessProfileView>[] = [
    new ParentBusinessRule(),
    new ListingDescriptionRule(),
    new ListingCategoryRule(),
    new ListingCoverPhotoRule(),
  ];

  static validate(listing: Listing, parentBusiness: BusinessProfileView): PublicationResult {
    const issues = this.rules.flatMap((rule) => rule.evaluate(listing, parentBusiness));
    return new PublicationResult(issues);
  }
}
