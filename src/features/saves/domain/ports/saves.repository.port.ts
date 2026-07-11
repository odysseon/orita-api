export interface SavedListingView {
  id: string;
  userId: string;
  listingId: string;
  createdAt: Date;
  listing: Record<string, unknown>; // We'll refine this later
}

export abstract class ISavesRepository {
  abstract saveListing(userId: string, listingId: string): Promise<void>;
  abstract unsaveListing(userId: string, listingId: string): Promise<void>;

  abstract isListingSaved(userId: string, listingId: string): Promise<boolean>;

  abstract getSavedListings(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ items: SavedListingView[]; total: number }>;
}
