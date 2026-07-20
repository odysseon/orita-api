import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags , ApiBearerAuth } from '@nestjs/swagger';
import { CurrentIdentity, Public } from '@odysseon/whoami-adapter-nestjs';
import type { RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { CreateReviewUseCase } from '../../application/use-cases/create-review.use-case.js';
import { UpdateReviewUseCase } from '../../application/use-cases/update-review.use-case.js';
import { DeleteReviewUseCase } from '../../application/use-cases/delete-review.use-case.js';
import { GetListingReviewsUseCase } from '../../application/use-cases/get-listing-reviews.use-case.js';
import { CreateReviewDto, UpdateReviewDto, GetListingReviewsQueryDto } from '../dto/request.dto.js';
import { ReviewResponseDto, ReviewPageDto } from '../dto/response.dto.js';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller()
export class ReviewController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createReview: CreateReviewUseCase,
    private readonly updateReview: UpdateReviewUseCase,
    private readonly deleteReview: DeleteReviewUseCase,
    private readonly getListingReviews: GetListingReviewsUseCase,
  ) {}

  /**
   * POST /listings/:listingId/reviews
   * Submit a review for a listing.
   */
  @Post('listings/:listingId/reviews')
  async create(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('listingId') listingId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const reviewerId = await this.resolveUserId(identity.accountId);
    const review = await this.createReview.execute({
      listingId,
      reviewerId,
      rating: dto.rating,
      ...(dto.comment !== undefined && { comment: dto.comment }),
    });
    return ReviewResponseDto.from(review);
  }

  /**
   * GET /listings/:listingId/reviews
   * Public — paginated list of reviews with embedded media.
   */
  @Public()
  @Get('listings/:listingId/reviews')
  async listByListing(
    @Param('listingId') listingId: string,
    @Query() query: GetListingReviewsQueryDto,
  ): Promise<ReviewPageDto> {
    const page = await this.getListingReviews.execute({
      listingId,
      ...(query.cursor !== undefined && { cursor: query.cursor }),
      ...(query.limit !== undefined && { limit: query.limit }),
    });
    return ReviewPageDto.from(page);
  }

  /**
   * PATCH /reviews/:id
   * Update own review's rating and/or comment.
   */
  @Patch('reviews/:id')
  async update(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const requesterId = await this.resolveUserId(identity.accountId);
    const review = await this.updateReview.execute(id, requesterId, {
      ...(dto.rating !== undefined && { rating: dto.rating }),
      ...(dto.comment !== undefined && { comment: dto.comment }),
    });
    return ReviewResponseDto.from(review);
  }

  /**
   * DELETE /reviews/:id
   * Reviewer or ADMIN can delete.
   */
  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { accountId: identity.accountId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    const isAdmin = user.role === 'ADMIN';
    await this.deleteReview.execute(id, user.id, isAdmin);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async resolveUserId(accountId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    return user.id;
  }
}
