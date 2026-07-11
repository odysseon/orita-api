import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { IReviewRepository } from './domain/ports/review.repository.port.js';
import { PrismaReviewRepository } from './infrastructure/prisma-review.repository.js';
import { CreateReviewUseCase } from './application/use-cases/create-review.use-case.js';
import { UpdateReviewUseCase } from './application/use-cases/update-review.use-case.js';
import { DeleteReviewUseCase } from './application/use-cases/delete-review.use-case.js';
import { GetListingReviewsUseCase } from './application/use-cases/get-listing-reviews.use-case.js';
import { ReviewController } from './api/controllers/review.controller.js';

@Module({
  imports: [forwardRef(() => MediaModule)],
  controllers: [ReviewController],
  providers: [
    {
      provide: IReviewRepository,
      useClass: PrismaReviewRepository,
    },
    CreateReviewUseCase,
    UpdateReviewUseCase,
    DeleteReviewUseCase,
    GetListingReviewsUseCase,
  ],
})
export class ReviewModule {}
