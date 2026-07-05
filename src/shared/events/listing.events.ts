import { ListingStatus } from '../../features/listing/domain/types/listing-status.enum.js';

export class ListingCreatedEvent {
  constructor(
    public readonly listingId: string,
    public readonly listingSlug: string,
    public readonly listingTitle: string,
    public readonly businessProfileId: string,
    public readonly businessName: string,
    public readonly actorId?: string,
  ) {}
}

export class ListingUpdatedEvent {
  constructor(
    public readonly listingId: string,
    public readonly businessProfileId: string,
  ) {}
}

export class ListingStatusChangedEvent {
  constructor(
    public readonly listingId: string,
    public readonly businessProfileId: string,
    public readonly oldStatus: ListingStatus,
    public readonly newStatus: ListingStatus,
  ) {}
}
