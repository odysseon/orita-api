import { Module } from '@nestjs/common';
import { SearchController } from './api/search.controller.js';
import { ListingSearchService } from './application/listing-search.service.js';
import { BusinessSearchService } from './application/business-search.service.js';
import { UserSearchService } from './application/user-search.service.js';

@Module({
  controllers: [SearchController],
  providers: [ListingSearchService, BusinessSearchService, UserSearchService],
  exports: [ListingSearchService, BusinessSearchService, UserSearchService],
})
export class SearchModule {}
