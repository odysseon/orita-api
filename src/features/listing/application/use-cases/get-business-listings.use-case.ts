import { Injectable, NotFoundException } from '@nestjs/common';
import { IListingRepository } from '../../domain/ports/listing.repository.port.js';
import { IBusinessProfileRepository } from '../../../business-profile/domain/ports/business-profile.repository.port.js';
import { Listing } from '../../domain/types/listing.entity.js';

@Injectable()
export class GetBusinessListingsUseCase {
  constructor(
    private readonly listingRepo: IListingRepository,
    private readonly businessRepo: IBusinessProfileRepository,
  ) {}

  async execute(ownerId: string): Promise<Listing[]> {
    const profile = await this.businessRepo.findByOwner(ownerId);

    if (!profile) {
      throw new NotFoundException('You must create a business profile before managing listings.');
    }

    return this.listingRepo.findByBusinessProfile(profile.id);
  }
}
