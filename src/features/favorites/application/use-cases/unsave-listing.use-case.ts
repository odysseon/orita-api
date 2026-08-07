import { Injectable } from '@nestjs/common';
import { IFavoritesRepository } from '../../domain/ports/favorites.repository.port.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import { TransactionManager } from '../../../../prisma/transaction-manager.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class UnsaveListingUseCase {
  constructor(
    private readonly favoritesRepository: IFavoritesRepository,
    private readonly eventBus: EventBusService,
    private readonly transactionManager: TransactionManager,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: string, listingId: string): Promise<void> {
    await this.transactionManager.execute(this.prisma, async () => {
      await this.favoritesRepository.unsaveListing(userId, listingId);
      await this.eventBus.publish('listing.unsaved', { userId, listingId });
    });
  }
}
