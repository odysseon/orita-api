import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentIdentity } from '@odysseon/whoami-adapter-nestjs';
import type { RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { CreateListingUseCase } from '../../application/use-cases/create-listing.use-case.js';
import { UpdateListingUseCase } from '../../application/use-cases/update-listing.use-case.js';
import { TransitionListingStatusUseCase } from '../../application/use-cases/transition-listing-status.use-case.js';
import { DeleteListingUseCase } from '../../application/use-cases/delete-listing.use-case.js';
import { GetBusinessListingsUseCase } from '../../application/use-cases/get-business-listings.use-case.js';
import { GetPrivateListingUseCase } from '../../application/use-cases/get-private-listing.use-case.js';
import { CheckListingPublicationReadinessUseCase } from '../../application/use-cases/check-listing-publication-readiness.use-case.js';
import { PublicationReadinessResult } from '../../../../shared/domain/publication.types.js';
import {
  CreateListingDto,
  UpdateListingDto,
  TransitionListingStatusDto,
} from '../dto/request.dto.js';
import { ListingResponseDto } from '../dto/response.dto.js';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Listing')
@ApiBearerAuth()
@Controller()
export class ListingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createListing: CreateListingUseCase,
    private readonly updateListing: UpdateListingUseCase,
    private readonly transitionStatus: TransitionListingStatusUseCase,
    private readonly deleteListing: DeleteListingUseCase,
    private readonly getBusinessListings: GetBusinessListingsUseCase,
    private readonly getPrivateListing: GetPrivateListingUseCase,
    private readonly checkListingPublicationReadiness: CheckListingPublicationReadinessUseCase,
  ) {}

  @Post('listings')
  async create(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() dto: CreateListingDto,
  ): Promise<ListingResponseDto> {
    const userId = await this.resolveUserId(identity.accountId);

    const listing = await this.createListing.execute({
      ownerId: userId,
      title: dto.title,
      ...(dto.description !== undefined && { description: dto.description }),
      categoryId: dto.categoryId,
      ...(dto.attributes !== undefined && { attributes: dto.attributes }),
      ...(dto.price && {
        price: {
          ...(dto.price.minPrice !== undefined && { minPrice: dto.price.minPrice }),
          ...(dto.price.maxPrice !== undefined && { maxPrice: dto.price.maxPrice }),
          ...(dto.price.currencyCode !== undefined && { currencyCode: dto.price.currencyCode }),
          isNegotiable: dto.price.isNegotiable,
        },
      }),
      ...(dto.availability !== undefined && { availability: dto.availability }),
      ...(dto.serviceAreas !== undefined && { serviceAreas: dto.serviceAreas }),
    });

    return ListingResponseDto.from(listing);
  }

  @Patch('listings/:id')
  async update(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ): Promise<ListingResponseDto> {
    const userId = await this.resolveUserId(identity.accountId);

    const listing = await this.updateListing.execute(id, userId, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.attributes !== undefined && { attributes: dto.attributes }),
      ...(dto.price && {
        price: {
          ...(dto.price.minPrice !== undefined && { minPrice: dto.price.minPrice }),
          ...(dto.price.maxPrice !== undefined && { maxPrice: dto.price.maxPrice }),
          ...(dto.price.currencyCode !== undefined && { currencyCode: dto.price.currencyCode }),
          isNegotiable: dto.price.isNegotiable,
        },
      }),
      ...(dto.availability !== undefined && { availability: dto.availability }),
      ...(dto.serviceAreas !== undefined && { serviceAreas: dto.serviceAreas }),
    });

    return ListingResponseDto.from(listing);
  }

  @Patch('listings/:id/status')
  async transition(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
    @Body() dto: TransitionListingStatusDto,
  ): Promise<ListingResponseDto> {
    const userId = await this.resolveUserId(identity.accountId);
    const listing = await this.transitionStatus.execute(id, userId, dto.status);
    return ListingResponseDto.from(listing);
  }

  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = await this.resolveUserId(identity.accountId);
    await this.deleteListing.execute(id, userId);
  }

  @Get('listings/mine')
  async getMyListings(@CurrentIdentity() identity: RequestIdentity): Promise<ListingResponseDto[]> {
    const userId = await this.resolveUserId(identity.accountId);
    const listings = await this.getBusinessListings.execute(userId);
    return listings.map((l) => ListingResponseDto.from(l));
  }

  @Get('listings/mine/:id')
  async getMyListingById(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
  ): Promise<ListingResponseDto> {
    const userId = await this.resolveUserId(identity.accountId);
    const listing = await this.getPrivateListing.execute(id, userId);
    return ListingResponseDto.from(listing);
  }

  @Get('listings/:id/publication-readiness')
  async checkReadiness(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
  ): Promise<PublicationReadinessResult> {
    const userId = await this.resolveUserId(identity.accountId);
    return this.checkListingPublicationReadiness.execute(id, userId);
  }

  private async resolveUserId(accountId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('User not found.');
    return user.id;
  }
}
