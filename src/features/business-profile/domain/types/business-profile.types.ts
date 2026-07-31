import { OperatingHours } from './operating-hours.types.js';
import { Tag } from './tag.types.js';
import {
  BusinessType,
  ServiceMode,
  ServiceAreaType,
} from '../../../../../generated/prisma/client.js';

export interface ServiceAreaInput {
  readonly name?: string;
  readonly type: ServiceAreaType;
  readonly administrativeRegionId?: string;
  readonly radiusKm?: number;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly polygon?: Array<[number, number]>;
  readonly displayOrder?: number;
  readonly enabled?: boolean;
}

export interface CreateBusinessProfileInput {
  readonly ownerId: string;
  readonly name: string;
  readonly businessType?: BusinessType;
  readonly contactPhone?: string;
  readonly whatsapp?: string;
  readonly contactEmail?: string;
  readonly description?: string;
  readonly websiteUrl?: string;
  readonly location?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly isPublic?: boolean;
  readonly primaryCategoryId?: string;
  readonly secondaryCategoryIds?: string[];
  readonly serviceModes?: ServiceMode[];
  readonly serviceAreas?: ServiceAreaInput[];
}

export interface UpdateBusinessProfileInput {
  readonly name?: string;
  readonly businessType?: BusinessType;
  readonly description?: string;
  readonly websiteUrl?: string;
  readonly contactPhone?: string;
  readonly whatsapp?: string;
  readonly contactEmail?: string;
  readonly location?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly primaryCategoryId?: string;
  readonly secondaryCategoryIds?: string[];
  readonly serviceModes?: ServiceMode[];
  readonly serviceAreas?: ServiceAreaInput[];
}

export interface BusinessProfileView {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly slug: string;
  readonly isPublic: boolean;
  readonly businessType: BusinessType;
  readonly description: string | null;
  readonly contactPhone: string | null;
  readonly whatsapp: string | null;
  readonly contactEmail: string | null;
  readonly websiteUrl: string | null;
  readonly locationId: string | null;
  readonly location: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly primaryCategoryId: string | null;
  readonly secondaryCategoryIds: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly operatingHours?: OperatingHours[];
  readonly tags?: Tag[];
  readonly avatarUrl?: string;
  readonly coverUrl?: string;
  readonly isFollowed?: boolean;
}

export interface BusinessSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly businessType: BusinessType;
  readonly description: string | null;
  readonly location: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly primaryCategoryId: string | null;
  readonly secondaryCategoryIds: string[];
  readonly distanceKm?: number; // Added dynamically during proximity queries
  readonly isFollowed?: boolean;
}

export interface DiscoverBusinessesInput {
  readonly search?: string;
  /** Filter by an exact categoryId */
  readonly categoryId?: string;
  /** Filter by root category slug — returns all businesses in a leaf under that root */
  readonly rootSlug?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly radiusInKm?: number;
  readonly currentUserId?: string;
  readonly page: number;
  readonly limit: number;
}

export interface PaginatedBusinessSummaries {
  readonly items: BusinessSummary[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}
