export enum PublicationIssueCode {
  BUSINESS_DESCRIPTION_REQUIRED = 'BUSINESS_DESCRIPTION_REQUIRED',
  BUSINESS_COVER_REQUIRED = 'BUSINESS_COVER_REQUIRED',
  LOCATION_REQUIRED = 'LOCATION_REQUIRED',
  CATEGORY_REQUIRED = 'CATEGORY_REQUIRED',
  CONTACT_METHOD_REQUIRED = 'CONTACT_METHOD_REQUIRED',
  LISTING_DESCRIPTION_REQUIRED = 'LISTING_DESCRIPTION_REQUIRED',
  LISTING_COVER_REQUIRED = 'LISTING_COVER_REQUIRED',
  PARENT_BUSINESS_PRIVATE = 'PARENT_BUSINESS_PRIVATE',
  PARENT_BUSINESS_NO_CONTACT = 'PARENT_BUSINESS_NO_CONTACT',
  LISTING_PRICING_REQUIRED = 'LISTING_PRICING_REQUIRED',
  LISTING_ATTRIBUTE_VALIDATION_FAILED = 'LISTING_ATTRIBUTE_VALIDATION_FAILED'
}

export type PublicationSeverity = 'ERROR' | 'WARNING';

export interface PublicationIssue {
  code: PublicationIssueCode;
  severity: PublicationSeverity;
  message: string;
}

export interface PublicationRule<T, C = void> {
  evaluate(entity: T, context?: C): PublicationIssue[];
}

export interface PublicationReadinessResult {
  ready: boolean;
  issues: PublicationIssue[];
}

export class PublicationResult {
  constructor(public readonly issues: PublicationIssue[] = []) {}

  isValid(): boolean {
    return !this.issues.some((i) => i.severity === 'ERROR');
  }

  get errors(): PublicationIssue[] {
    return this.issues.filter((i) => i.severity === 'ERROR');
  }

  get warnings(): PublicationIssue[] {
    return this.issues.filter((i) => i.severity === 'WARNING');
  }
}
