import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ListingSearchService } from '../application/listing-search.service.js';
import { BusinessSearchService } from '../application/business-search.service.js';
import { SearchListingsDto, SearchBusinessesDto } from '../dto/search.dto.js';
import { Public } from '@odysseon/whoami-adapter-nestjs';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly listingSearchService: ListingSearchService,
    private readonly businessSearchService: BusinessSearchService,
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
}
