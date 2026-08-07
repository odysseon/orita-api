import { Injectable, NotFoundException } from '@nestjs/common';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { BusinessTourCreatedEvent } from '../../../../shared/events/business-tour.events.js';
import { IBusinessTourRepository } from '../../domain/ports/business-tour.repository.port.js';
import { BusinessTour } from '../../domain/types/business-tour.entity.js';
import { CreateBusinessTourInput } from '../../domain/types/business-tour.types.js';
import { TransactionManager } from '../../../../prisma/transaction-manager.service.js';

@Injectable()
export class CreateBusinessTourUseCase {
  constructor(
    private readonly businessTourRepo: IBusinessTourRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(input: CreateBusinessTourInput): Promise<BusinessTour> {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id: input.businessProfileId },
      select: { id: true, name: true, email: true },
    });

    if (!business) {
      throw new NotFoundException('Business profile not found.');
    }

    return this.transactionManager.execute(this.prisma, async () => {
      const tour = await this.businessTourRepo.create(input);

      await this.eventBus.publish(
        'tour.uploaded',
        new BusinessTourCreatedEvent(tour.id, tour.businessProfileId),
      );

      return tour;
    });
  }
}
