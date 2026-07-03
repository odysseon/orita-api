import { Injectable } from '@nestjs/common';
import { ISavesRepository } from '../../domain/ports/saves.repository.port.js';

import { EventBusService } from '../../../../shared/events/event-bus.service.js';

@Injectable()
export class SaveBusinessUseCase {
  constructor(
    private readonly savesRepository: ISavesRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(userId: string, businessProfileId: string): Promise<void> {
    await this.savesRepository.saveBusiness(userId, businessProfileId);
    await this.eventBus.publish('business.saved', { userId, businessProfileId });
  }
}
