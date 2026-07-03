import { Injectable } from '@nestjs/common';
import { ISavesRepository } from '../../domain/ports/saves.repository.port.js';

import { EventBusService } from '../../../../shared/events/event-bus.service.js';

@Injectable()
export class UnsaveListingUseCase {
  constructor(
    private readonly savesRepository: ISavesRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(userId: string, listingId: string): Promise<void> {
    await this.savesRepository.unsaveListing(userId, listingId);
    await this.eventBus.publish('listing.unsaved', { userId, listingId });
  }
}
