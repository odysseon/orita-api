import { Injectable, ConflictException } from '@nestjs/common';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import slugify from 'slugify';
import { BusinessProfileCreatedEvent } from '../../../../shared/events/business-profile.events.js';
import { IBusinessProfileRepository } from '../../domain/ports/business-profile.repository.port.js';
import {
  CreateBusinessProfileInput,
  BusinessProfileView,
} from '../../domain/types/business-profile.types.js';
import { TransactionManager } from '../../../../prisma/transaction-manager.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class CreateBusinessProfileUseCase {
  constructor(
    private readonly repo: IBusinessProfileRepository,
    private readonly eventBus: EventBusService,
    private readonly transactionManager: TransactionManager,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateBusinessProfileInput): Promise<BusinessProfileView> {
    const existing = await this.repo.findByOwner(input.ownerId);
    if (existing) {
      throw new ConflictException('A user can only own at most one business profile.');
    }

    const slug = await this.deriveUniqueSlug(input.name);

    return this.transactionManager.execute(this.prisma, async () => {
      const profile = await this.repo.create(
        {
          ...input,
          isPublic: false,
        },
        slug,
      );

      await this.eventBus.publish(
        'business.created',
        new BusinessProfileCreatedEvent(profile.id, profile.ownerId),
      );

      return profile;
    });
  }

  private async deriveUniqueSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true });

    if (!(await this.repo.isSlugTaken(base))) {
      return base;
    }

    // Append random suffix until unique
    for (let i = 0; i < 5; i++) {
      const candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
      if (!(await this.repo.isSlugTaken(candidate))) {
        return candidate;
      }
    }

    throw new ConflictException('Could not generate a unique slug. Please try a different name.');
  }
}
