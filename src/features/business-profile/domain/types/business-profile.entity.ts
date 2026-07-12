
import { BusinessType } from '../../../../../generated/prisma/client.js';

/**
 * Represents a public commercial storefront identity owned by a user.
 *
 * Branding media (logo, banner, gallery) is owned by the Media feature
 * via MediaResourceType.BUSINESS_PROFILE. order=0 is the primary brand image.
 *
 * NOT:
 *   - a user account
 *   - a team or org system
 *   - a CRM record
 *   - a legal entity abstraction
 */
export interface BusinessProfile {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly slug: string;
  readonly isPublic: boolean;
  readonly description: string | null;
  readonly businessType: BusinessType;
  readonly websiteUrl: string | null;
  readonly contactPhone: string;
  readonly whatsapp: string;
  readonly contactEmail: string;
  readonly locationId: string | null;
  readonly location: string | null;
  readonly categoryIds: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
