import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IListingRepository } from '../../domain/ports/listing.repository.port.js';
import { IBusinessProfileRepository } from '../../../business-profile/domain/ports/business-profile.repository.port.js';
import { Listing } from '../../domain/types/listing.entity.js';

@Injectable()
export class GetPrivateListingUseCase {
  constructor(
    private readonly listingRepo: IListingRepository,
    private readonly businessRepo: IBusinessProfileRepository,
  ) {}

  async execute(listingId: string, requesterId: string): Promise<Listing> {
    const listing = await this.listingRepo.findById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const profile = await this.businessRepo.findById(listing.businessProfileId);
    
    if (!profile || profile.ownerId !== requesterId) {
      throw new ForbiddenException('You do not own this listing.');
    }

    return listing;
  }
}
