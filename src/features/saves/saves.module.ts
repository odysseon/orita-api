import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { SavesController } from './api/controllers/saves.controller.js';
import { ISavesRepository } from './domain/ports/saves.repository.port.js';
import { PrismaSavesRepository } from './infrastructure/prisma-saves.repository.js';
import { SaveListingUseCase } from './application/use-cases/save-listing.use-case.js';
import { UnsaveListingUseCase } from './application/use-cases/unsave-listing.use-case.js';
import { GetSavedListingsUseCase } from './application/use-cases/get-saved-listings.use-case.js';

@Module({
  imports: [forwardRef(() => MediaModule)],
  controllers: [SavesController],
  providers: [
    {
      provide: ISavesRepository,
      useClass: PrismaSavesRepository,
    },
    SaveListingUseCase,
    UnsaveListingUseCase,
    GetSavedListingsUseCase,
  ],
  exports: [ISavesRepository],
})
export class SavesModule {}
