import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentIdentity } from '@odysseon/whoami-adapter-nestjs';
import type { RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { PrismaFeedRepository, FeedQueryParams } from '../infrastructure/prisma-feed.repository.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

@ApiTags('Feed')
@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedRepository: PrismaFeedRepository,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Get a personalized neighborhood feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursorScore', required: false, type: Number })
  @ApiQuery({ name: 'cursorId', required: false, type: String })
  @Get()
  async getFeed(
    @CurrentIdentity() identity: RequestIdentity,
    @Query('limit') limitStr?: string,
    @Query('cursorScore') cursorScoreStr?: string,
    @Query('cursorId') cursorId?: string,
  ) {
    let limit = limitStr ? parseInt(limitStr, 10) : 20;
    if (Number.isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    let cursorScore = cursorScoreStr ? parseFloat(cursorScoreStr) : undefined;
    if (cursorScore !== undefined && Number.isNaN(cursorScore)) cursorScore = undefined;

    // Get the user's location
    const user = await this.prisma.user.findUnique({
      where: { accountId: identity.accountId },
      include: { location: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.locationId) {
      // Return empty feed if user has no location set
      // The frontend should prompt them to allow location
      return [];
    }

    // We need the raw coordinates from PostGIS
    const locResult = await this.prisma.$queryRaw<{ lng: number; lat: number }[]>`
      SELECT ST_X(coordinates::geometry) as lng, ST_Y(coordinates::geometry) as lat
      FROM "Location"
      WHERE id = ${user.locationId}
    `;

    const first = locResult[0];
    if (!first) {
      return [];
    }

    const lng = first.lng;
    const lat = first.lat;

    const params: FeedQueryParams = {
      userId: user.id,
      userLat: lat,
      userLng: lng,
      limit,
    };

    if (cursorScore !== undefined) params.cursorScore = cursorScore;
    if (cursorId !== undefined) params.cursorId = cursorId;

    const items = await this.feedRepository.getFeed(params);

    return items;
  }
}
