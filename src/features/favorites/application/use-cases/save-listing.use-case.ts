import { Injectable } from '@nestjs/common';
import { IFavoritesRepository } from '../../domain/ports/favorites.repository.port.js';

import { EventBusService } from '../../../../shared/events/event-bus.service.js';

@Injectable()
export class SaveListingUseCase {
  constructor(
    private readonly favoritesRepository: IFavoritesRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(userId: string, listingId: string): Promise<void> {
    await this.favoritesRepository.saveListing(userId, listingId);
    await this.eventBus.publish('listing.saved', { userId, listingId });
  }
}
