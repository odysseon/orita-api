import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { FavoritesController } from './api/controllers/favorites.controller.js';
import { IFavoritesRepository } from './domain/ports/favorites.repository.port.js';
import { PrismaFavoritesRepository } from './infrastructure/prisma-favorites.repository.js';
import { SaveListingUseCase } from './application/use-cases/save-listing.use-case.js';
import { UnsaveListingUseCase } from './application/use-cases/unsave-listing.use-case.js';
import { GetFavoritesUseCase } from './application/use-cases/get-favorites.use-case.js';

@Module({
  imports: [forwardRef(() => MediaModule)],
  controllers: [FavoritesController],
  providers: [
    {
      provide: IFavoritesRepository,
      useClass: PrismaFavoritesRepository,
    },
    SaveListingUseCase,
    UnsaveListingUseCase,
    GetFavoritesUseCase,
  ],
  exports: [IFavoritesRepository],
})
export class FavoritesModule {}
