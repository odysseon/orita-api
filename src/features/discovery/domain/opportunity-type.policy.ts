import { OpportunityType } from '../../../../generated/prisma/client.js';

export interface OpportunityTypePolicy {
  ttlHours: number;
  freshnessHalfLifeHours: number;
  maxPhotos: number;
  canOverrideExpiry: boolean;
  editWindowHours: number;
}

export const OPPORTUNITY_TYPE_POLICIES: Record<OpportunityType, OpportunityTypePolicy> = {
  TEMP_SERVICE: {
    ttlHours: 24,
    freshnessHalfLifeHours: 4,
    maxPhotos: 3,
    canOverrideExpiry: false,
    editWindowHours: 1,
  },
  FREE: {
    ttlHours: 48,
    freshnessHalfLifeHours: 8,
    maxPhotos: 5,
    canOverrideExpiry: false,
    editWindowHours: 2,
  },
  WANTED: {
    ttlHours: 72,
    freshnessHalfLifeHours: 24,
    maxPhotos: 2,
    canOverrideExpiry: true,
    editWindowHours: 6,
  },
  FOR_SALE: {
    ttlHours: 168,
    freshnessHalfLifeHours: 36,
    maxPhotos: 5,
    canOverrideExpiry: true,
    editWindowHours: 24,
  },
  BORROW_LEND: {
    ttlHours: 168,
    freshnessHalfLifeHours: 36,
    maxPhotos: 3,
    canOverrideExpiry: true,
    editWindowHours: 24,
  },
  LOST_FOUND: {
    ttlHours: 336,
    freshnessHalfLifeHours: 72,
    maxPhotos: 5,
    canOverrideExpiry: true,
    editWindowHours: 48,
  },
};
