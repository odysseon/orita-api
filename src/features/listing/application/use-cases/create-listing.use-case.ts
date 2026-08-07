import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import slugify from 'slugify';
import { ListingCreatedEvent } from '../../../../shared/events/listing.events.js';
import { IListingRepository } from '../../domain/ports/listing.repository.port.js';
import { CreateListingInput } from '../../domain/types/listing.types.js';
import { Listing } from '../../domain/types/listing.entity.js';
import { ICategoryRepository } from '../../../category/domain/ports/category.repository.port.js';
import { IBusinessProfileRepository } from '../../../business-profile/domain/ports/business-profile.repository.port.js';
import { ValidateListingAttributesService } from '../services/validate-listing-attributes.service.js';
import { TransactionManager } from '../../../../prisma/transaction-manager.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class CreateListingUseCase {
  constructor(
    private readonly repo: IListingRepository,
    private readonly categoryRepo: ICategoryRepository,
    private readonly attributeValidator: ValidateListingAttributesService,
    private readonly businessProfileRepo: IBusinessProfileRepository,
    private readonly eventBus: EventBusService,
    private readonly transactionManager: TransactionManager,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateListingInput): Promise<Listing> {
    const businessProfile = await this.businessProfileRepo.findByOwner(input.ownerId);
    if (!businessProfile) {
      throw new NotFoundException('You must create a business profile before managing listings.');
    }

    const category = await this.categoryRepo.findById(input.categoryId);

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    if (!category.isActive) {
      throw new BadRequestException('Cannot create a listing under an inactive category.');
    }

    if (!category.parentId) {
      throw new BadRequestException(
        'Listings must be assigned to a specific leaf category, not a root category.',
      );
    }

    if (input.attributes) {
      await this.attributeValidator.validate(input.categoryId, input.attributes);
    }

    const slug = await this.deriveUniqueSlug(businessProfile.id, input.title);

    return this.transactionManager.execute(this.prisma, async () => {
      const listing = await this.repo.create(businessProfile.id, input, slug);

      await this.eventBus.publish(
        'listing.published',
        new ListingCreatedEvent(
          listing.id,
          listing.slug,
          listing.title,
          listing.businessProfileId,
          businessProfile.name,
        ),
        {
          location:
            businessProfile.latitude && businessProfile.longitude
              ? {
                  lat: businessProfile.latitude,
                  lng: businessProfile.longitude,
                }
              : undefined,
          categoryIds: [
            ...(businessProfile.primaryCategoryId ? [businessProfile.primaryCategoryId] : []),
            ...(businessProfile.secondaryCategoryIds ?? []),
            category.id,
          ],
        },
      );

      return listing;
    });
  }

  private async deriveUniqueSlug(businessProfileId: string, title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });

    if (!(await this.repo.isSlugTaken(businessProfileId, base))) {
      return base;
    }

    for (let i = 0; i < 5; i++) {
      const candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
      if (!(await this.repo.isSlugTaken(businessProfileId, candidate))) {
        return candidate;
      }
    }

    throw new ConflictException('Could not generate a unique slug. Please try a different title.');
  }
}
