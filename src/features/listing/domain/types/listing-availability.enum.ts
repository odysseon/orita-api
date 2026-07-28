export const ListingAvailability = {
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PRE_ORDER: 'PRE_ORDER',
} as const;

export type ListingAvailability = (typeof ListingAvailability)[keyof typeof ListingAvailability];
