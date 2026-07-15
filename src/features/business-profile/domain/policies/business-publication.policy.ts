import {
  PublicationIssue,
  PublicationIssueCode,
  PublicationResult,
  PublicationRule,
} from '../../../../shared/domain/publication.types.js';
import { BusinessProfileView } from '../types/business-profile.types.js';

export class DescriptionRule implements PublicationRule<BusinessProfileView> {
  evaluate(profile: BusinessProfileView): PublicationIssue[] {
    if (!profile.description?.trim()) {
      return [
        {
          code: PublicationIssueCode.BUSINESS_DESCRIPTION_REQUIRED,
          severity: 'ERROR',
          message: 'A business description is required.',
        },
      ];
    }
    return [];
  }
}

export class LocationRule implements PublicationRule<BusinessProfileView> {
  evaluate(profile: BusinessProfileView): PublicationIssue[] {
    if (!profile.locationId) {
      return [
        {
          code: PublicationIssueCode.LOCATION_REQUIRED,
          severity: 'ERROR',
          message: 'A physical or operating location must be set.',
        },
      ];
    }
    return [];
  }
}

export class CategoryRule implements PublicationRule<BusinessProfileView> {
  evaluate(profile: BusinessProfileView): PublicationIssue[] {
    if (!profile.primaryCategoryId) {
      return [
        {
          code: PublicationIssueCode.CATEGORY_REQUIRED,
          severity: 'ERROR',
          message: 'At least one business category is required.',
        },
      ];
    }
    return [];
  }
}

export class ContactRule implements PublicationRule<BusinessProfileView> {
  evaluate(profile: BusinessProfileView): PublicationIssue[] {
    if (!profile.contactEmail && !profile.contactPhone && !profile.whatsapp) {
      return [
        {
          code: PublicationIssueCode.CONTACT_METHOD_REQUIRED,
          severity: 'ERROR',
          message: 'At least one contact method (email, phone, or WhatsApp) is required.',
        },
      ];
    }
    return [];
  }
}

export class CoverPhotoRule implements PublicationRule<BusinessProfileView> {
  evaluate(profile: BusinessProfileView): PublicationIssue[] {
    if (!profile.coverUrl) {
      return [
        {
          code: PublicationIssueCode.BUSINESS_COVER_REQUIRED,
          severity: 'ERROR',
          message: 'A business cover photo is required.',
        },
      ];
    }
    return [];
  }
}

export class BusinessPublicationPolicy {
  private static rules: PublicationRule<BusinessProfileView>[] = [
    new DescriptionRule(),
    new LocationRule(),
    new CategoryRule(),
    new ContactRule(),
    new CoverPhotoRule(),
  ];

  static validate(profile: BusinessProfileView): PublicationResult {
    const issues = this.rules.flatMap((rule) => rule.evaluate(profile));
    return new PublicationResult(issues);
  }
}
