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
import {
  CreateListingDto,
  UpdateListingDto,
  TransitionListingStatusDto,
} from '../dto/request.dto.js';
import { ListingResponseDto } from '../dto/response.dto.js';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Listing')
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
  ) {}

  @Post('businesses/:businessProfileId/listings')
  async create(
    @Param('businessProfileId') businessProfileId: string,
    @Body() dto: CreateListingDto,
  ): Promise<ListingResponseDto> {
    const listing = await this.createListing.execute({
      businessProfileId,
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

  @Get('businesses/:businessProfileId/listings/mine')
  async getMyListings(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('businessProfileId') businessProfileId: string,
  ): Promise<ListingResponseDto[]> {
    const userId = await this.resolveUserId(identity.accountId);
    const listings = await this.getBusinessListings.execute(businessProfileId, userId);
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

  private async resolveUserId(accountId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('User not found.');
    return user.id;
  }
}
