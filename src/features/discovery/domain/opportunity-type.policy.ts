import { OpportunityType } from '../../../../generated/prisma/client.js';

export interface OpportunityTypePolicy {
  ttlHours: number;
  freshnessHalfLifeHours: number;
  maxPhotos: number;
  canOverrideExpiry: boolean;
  editWindowHours: number;
}

export const OPPORTUNITY_TYPE_POLICIES: Record<OpportunityType, OpportunityTypePolicy> = {
  NEED: {
    ttlHours: 72,
    freshnessHalfLifeHours: 60,
    maxPhotos: 5,
    canOverrideExpiry: true,
    editWindowHours: 24,
  },
  OFFER: {
    ttlHours: 72,
    freshnessHalfLifeHours: 60,
    maxPhotos: 5,
    canOverrideExpiry: true,
    editWindowHours: 24,
  },
};
