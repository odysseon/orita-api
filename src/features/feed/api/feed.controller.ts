import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaFeedRepository, FeedQueryParams } from '../infrastructure/prisma-feed.repository.js';

@ApiTags('Feed')
@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedRepository: PrismaFeedRepository,
  ) {}

  @ApiOperation({ summary: 'Get a personalized neighborhood feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursorScore', required: false, type: Number })
  @ApiQuery({ name: 'cursorId', required: false, type: String })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @Get()
  async getFeed(
    @Query('limit') limitStr?: string,
    @Query('cursorScore') cursorScoreStr?: string,
    @Query('cursorId') cursorId?: string,
    @Query('lat') latStr?: string,
    @Query('lng') lngStr?: string,
  ) {
    let limit = limitStr ? parseInt(limitStr, 10) : 20;
    if (Number.isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    let cursorScore = cursorScoreStr ? parseFloat(cursorScoreStr) : undefined;
    if (cursorScore !== undefined && Number.isNaN(cursorScore)) cursorScore = undefined;

    const reqLat = latStr ? parseFloat(latStr) : undefined;
    const reqLng = lngStr ? parseFloat(lngStr) : undefined;

    if (
      reqLat === undefined ||
      Number.isNaN(reqLat) ||
      reqLng === undefined ||
      Number.isNaN(reqLng)
    ) {
      return [];
    }

    const params: FeedQueryParams = {
      userLat: reqLat,
      userLng: reqLng,
      limit,
    };

    if (cursorScore !== undefined) params.cursorScore = cursorScore;
    if (cursorId !== undefined) params.cursorId = cursorId;

    const items = await this.feedRepository.getFeed(params);

    return items;
  }
}
