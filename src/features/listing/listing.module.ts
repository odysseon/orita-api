import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { RedisModule } from '../../shared/redis/redis.module.js';
import { IListingRepository } from './domain/ports/listing.repository.port.js';
import { PrismaListingRepository } from './infrastructure/prisma-listing.repository.js';
import { IBusinessProfileRepository } from '../business-profile/domain/ports/business-profile.repository.port.js';
import { PrismaBusinessProfileRepository } from '../business-profile/infrastructure/prisma-business-profile.repository.js';
import { CreateListingUseCase } from './application/use-cases/create-listing.use-case.js';
import { UpdateListingUseCase } from './application/use-cases/update-listing.use-case.js';
import { TransitionListingStatusUseCase } from './application/use-cases/transition-listing-status.use-case.js';
import { DeleteListingUseCase } from './application/use-cases/delete-listing.use-case.js';
import { GetPublicListingUseCase } from './application/use-cases/get-public-listing.use-case.js';
import { GetBusinessListingsUseCase } from './application/use-cases/get-business-listings.use-case.js';
import { GetPrivateListingUseCase } from './application/use-cases/get-private-listing.use-case.js';
import { DiscoverListingsUseCase } from './application/use-cases/discover-listings.use-case.js';
import { ValidateListingAttributesService } from './application/services/validate-listing-attributes.service.js';
import { CategoryModule } from '../category/category.module.js';
import { PublicListingController } from './api/controllers/public-listing.controller.js';
import { ListingController } from './api/controllers/listing.controller.js';

@Module({
  imports: [CategoryModule, RedisModule, forwardRef(() => MediaModule)],
  controllers: [PublicListingController, ListingController],
  providers: [
    { provide: IListingRepository, useClass: PrismaListingRepository },
    { provide: IBusinessProfileRepository, useClass: PrismaBusinessProfileRepository },
    ValidateListingAttributesService,
    CreateListingUseCase,
    UpdateListingUseCase,
    TransitionListingStatusUseCase,
    DeleteListingUseCase,
    GetPublicListingUseCase,
    GetBusinessListingsUseCase,
    DiscoverListingsUseCase,
    GetPrivateListingUseCase,
  ],
})
export class ListingModule {}
