import { Module } from '@nestjs/common';
import { SearchController } from './api/search.controller.js';
import { ListingSearchService } from './application/listing-search.service.js';
import { BusinessSearchService } from './application/business-search.service.js';

@Module({
  controllers: [SearchController],
  providers: [ListingSearchService, BusinessSearchService],
  exports: [ListingSearchService, BusinessSearchService],
})
export class SearchModule {}
