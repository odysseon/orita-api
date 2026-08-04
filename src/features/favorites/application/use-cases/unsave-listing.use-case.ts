import { Injectable } from '@nestjs/common';
import { IFavoritesRepository } from '../../domain/ports/favorites.repository.port.js';

import { EventBusService } from '../../../../shared/events/event-bus.service.js';

@Injectable()
export class UnsaveListingUseCase {
  constructor(
    private readonly favoritesRepository: IFavoritesRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(userId: string, listingId: string): Promise<void> {
    await this.favoritesRepository.unsaveListing(userId, listingId);
    await this.eventBus.publish('listing.unsaved', { userId, listingId });
  }
}
