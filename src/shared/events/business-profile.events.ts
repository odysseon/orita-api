export class BusinessProfileCreatedEvent {
  constructor(
    public readonly businessProfileId: string,
    public readonly ownerId: string,
  ) {}
}

export class BusinessProfileUpdatedEvent {
  constructor(
    public readonly businessProfileId: string,
    public readonly ownerId: string,
  ) {}
}

export class BusinessProfilePublishedEvent {
  constructor(
    public readonly businessProfileId: string,
    public readonly businessName: string,
    public readonly businessSlug: string,
    public readonly locationId: string,
    public readonly ownerId: string,
  ) {}
}
