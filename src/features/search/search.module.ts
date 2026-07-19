import { Module } from '@nestjs/common';
import { SearchController } from './api/search.controller.js';
import { ListingSearchService } from './application/listing-search.service.js';
import { BusinessSearchService } from './application/business-search.service.js';
import { UserSearchService } from './application/user-search.service.js';
import { ShareableSearchService } from './application/shareable-search.service.js';
import { TourSearchService } from './application/tour-search.service.js';

import { MediaModule } from '../media/media.module.js';

@Module({
  imports: [MediaModule],
  controllers: [SearchController],
  providers: [
    BusinessSearchService,
    ListingSearchService,
    UserSearchService,
    ShareableSearchService,
    TourSearchService,
  ],
  exports: [BusinessSearchService, ListingSearchService, UserSearchService, ShareableSearchService, TourSearchService],
})
export class SearchModule {}
