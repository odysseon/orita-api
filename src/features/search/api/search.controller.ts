import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ListingSearchService } from '../application/listing-search.service.js';
import { BusinessSearchService } from '../application/business-search.service.js';
import {
  SearchListingsDto,
  SearchBusinessesDto,
  SearchUsersDto,
  SearchToursDto,
} from '../dto/search.dto.js';
import { Public } from '@odysseon/whoami-adapter-nestjs';
import { UserSearchService } from '../application/user-search.service.js';
import { ShareableSearchService } from '../application/shareable-search.service.js';
import { TourSearchService } from '../application/tour-search.service.js';
import { ShareableSearchResultDto } from '../../sharing/api/dto/response.dto.js';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(
    private readonly listingSearchService: ListingSearchService,
    private readonly businessSearchService: BusinessSearchService,
    private readonly userSearchService: UserSearchService,
    private readonly shareableSearchService: ShareableSearchService,
    private readonly tourSearchService: TourSearchService,
  ) {}

  @ApiOperation({
    summary: 'Search for listings using text, location, category, and dynamic attribute filters',
  })
  @ApiOkResponse({ description: 'Paginated list of matching listings' })
  @Public()
  @Get('listings')
  @HttpCode(HttpStatus.OK)
  async searchListings(@Query() dto: SearchListingsDto) {
    return this.listingSearchService.search(dto);
  }

  @ApiOperation({ summary: 'Search for businesses using text, location, and category filters' })
  @ApiOkResponse({ description: 'Paginated list of matching businesses' })
  @Public()
  @Get('businesses')
  @HttpCode(HttpStatus.OK)
  async searchBusinesses(@Query() dto: SearchBusinessesDto) {
    return this.businessSearchService.search(dto);
  }

  @ApiOperation({ summary: 'Search for users by username' })
  @ApiOkResponse({ description: 'Paginated list of matching users' })
  @Public()
  @Get('users')
  @HttpCode(HttpStatus.OK)
  async searchUsers(@Query() dto: SearchUsersDto) {
    return this.userSearchService.search(dto);
  }

  @ApiOperation({ summary: 'Universal search across businesses, listings, and tours for sharing' })
  @ApiOkResponse({ type: [ShareableSearchResultDto] })
  @Public()
  @Get('shareables')
  @HttpCode(HttpStatus.OK)
  async searchShareables(@Query('q') q: string) {
    return this.shareableSearchService.search(q || '');
  }

  @ApiOperation({ summary: 'Search for tours' })
  @ApiOkResponse({ description: 'Paginated list of matching tours' })
  @Public()
  @Get('tours')
  @HttpCode(HttpStatus.OK)
  async searchTours(@Query() dto: SearchToursDto) {
    return this.tourSearchService.search(dto);
  }
}
