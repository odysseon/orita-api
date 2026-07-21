import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import {
  OptionalAuth,
  CurrentIdentity,
  type RequestIdentity,
} from '@odysseon/whoami-adapter-nestjs';
import { DiscoverListingsUseCase } from '../../application/use-cases/discover-listings.use-case.js';
import { GetPublicListingUseCase } from '../../application/use-cases/get-public-listing.use-case.js';
import { GetListingsQueryDto } from '../dto/request.dto.js';
import { ListingResponseDto, PaginatedListingsResponseDto } from '../dto/response.dto.js';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IBusinessProfileRepository } from '../../../business-profile/domain/ports/business-profile.repository.port.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@ApiTags('Listing Public Surface')
@ApiBearerAuth()
@OptionalAuth()
@Controller()
export class PublicListingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discoverListings: DiscoverListingsUseCase,
    private readonly getPublicListing: GetPublicListingUseCase,
    private readonly businessRepo: IBusinessProfileRepository,
  ) {}

  /**
   * GET /listings
   * Global discovery — all published listings across all businesses.
   */
  @Get('listings')
  async discover(
    @Query() query: GetListingsQueryDto,
    @CurrentIdentity({ required: false }) identity?: RequestIdentity,
  ): Promise<PaginatedListingsResponseDto> {
    console.log('[PublicListingController.discover] Identity:', identity);
    const currentUserId = await this.resolveUserId(identity);
    console.log('[PublicListingController.discover] resolved currentUserId:', currentUserId);
    const result = await this.discoverListings.execute({
      ...query,
      ...(currentUserId ? { currentUserId } : {}),
    });
    return PaginatedListingsResponseDto.from(result);
  }

  /**
   * GET /businesses/:businessSlug/listings
   * Discovery scoped to a specific business profile.
   */
  @Get('businesses/:businessSlug/listings')
  async discoverByBusiness(
    @Param('businessSlug') businessSlug: string,
    @Query() query: GetListingsQueryDto,
    @CurrentIdentity({ required: false }) identity?: RequestIdentity,
  ): Promise<PaginatedListingsResponseDto> {
    const businessProfileId = await this.resolveBusinessSlug(businessSlug);
    const currentUserId = await this.resolveUserId(identity);
    const result = await this.discoverListings.execute({
      ...query,
      ...(businessProfileId ? { businessProfileId } : {}),
      ...(currentUserId ? { currentUserId } : {}),
    });
    return PaginatedListingsResponseDto.from(result);
  }

  private async resolveUserId(identity?: RequestIdentity): Promise<string | undefined> {
    const accountId = identity?.accountId;

    if (accountId) {
      const user = await this.prisma.user.findUnique({
        where: { accountId },
        select: { id: true },
      });
      return user?.id;
    }
    return undefined;
  }

  private async resolveBusinessSlug(slug: string): Promise<string> {
    const profile = await this.businessRepo.findBySlug(slug);

    if (!profile) {
      throw new NotFoundException('Business profile not found.');
    }

    return profile.id;
  }

  /**
   * GET /listings/:slug
   * Public listing detail page.
   */
  @Get('listings/:slug')
  async getBySlug(
    @Param('slug') slug: string,
    @CurrentIdentity({ required: false }) identity?: RequestIdentity,
  ): Promise<ListingResponseDto> {
    const currentUserId = await this.resolveUserId(identity);
    const listing = await this.getPublicListing.execute(slug, currentUserId);
    return ListingResponseDto.from(listing);
  }
}
