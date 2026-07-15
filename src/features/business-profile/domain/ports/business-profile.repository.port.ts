import {
  CreateBusinessProfileInput,
  DiscoverBusinessesInput,
  PaginatedBusinessSummaries,
  UpdateBusinessProfileInput,
  BusinessProfileView,
} from '../types/business-profile.types.js';
import { SetOperatingHoursInput } from '../types/operating-hours.types.js';

export abstract class IBusinessProfileRepository {
  abstract create(input: CreateBusinessProfileInput, slug: string): Promise<BusinessProfileView>;
  abstract findById(id: string): Promise<BusinessProfileView | null>;
  abstract findBySlug(slug: string): Promise<BusinessProfileView | null>;
  abstract isSlugTaken(slug: string): Promise<boolean>;
  abstract findByOwner(ownerId: string): Promise<BusinessProfileView | null>;
  abstract update(id: string, input: UpdateBusinessProfileInput): Promise<BusinessProfileView>;
  abstract delete(id: string): Promise<void>;
  abstract discover(input: DiscoverBusinessesInput): Promise<PaginatedBusinessSummaries>;
  abstract setVisibility(id: string, isPublic: boolean): Promise<void>;

  // Operating Hours & Tags
  abstract setOperatingHours(businessId: string, hours: SetOperatingHoursInput[]): Promise<void>;
  abstract setTags(businessId: string, tagIds: string[]): Promise<void>;
}
