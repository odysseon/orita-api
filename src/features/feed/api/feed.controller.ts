import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaFeedRepository, FeedQueryParams } from '../infrastructure/prisma-feed.repository.js';
import {
  OptionalAuth,
  CurrentIdentity,
  type RequestIdentity,
} from '@odysseon/whoami-adapter-nestjs';
import { IdentityService } from '../../../shared/identity/identity.service.js';
import { BadRequestException } from '@nestjs/common';

@ApiTags('Feed')
@ApiBearerAuth()
@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedRepository: PrismaFeedRepository,
    private readonly identityService: IdentityService,
  ) {}

  @ApiOperation({ summary: 'Get a personalized neighborhood feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursorScore', required: false, type: Number })
  @ApiQuery({ name: 'cursorId', required: false, type: String })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @OptionalAuth()
  @Get()
  async getFeed(
    @CurrentIdentity({ required: false }) identity?: RequestIdentity,
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

    let reqLat = latStr ? parseFloat(latStr) : undefined;
    let reqLng = lngStr ? parseFloat(lngStr) : undefined;

    let userId: string | undefined;

    if (
      reqLat === undefined ||
      Number.isNaN(reqLat) ||
      reqLng === undefined ||
      Number.isNaN(reqLng)
    ) {
      if (identity?.accountId) {
        // Fallback to active exploration context
        const user = await this.identityService.resolveUser(identity.accountId);
        if (user) {
          userId = user.id;
          if (user.activeExplorationLat != null && user.activeExplorationLng != null) {
            reqLat = user.activeExplorationLat;
            reqLng = user.activeExplorationLng;
          } else {
            throw new BadRequestException('Exploration context is required to load the feed.');
          }
        } else {
          throw new BadRequestException('Exploration context is required to load the feed.');
        }
      } else {
        throw new BadRequestException('Exploration context is required to load the feed.');
      }
    } else if (identity?.accountId) {
      const user = await this.identityService.resolveUser(identity.accountId);
      if (user) {
        userId = user.id;
      }
    }

    if (
      reqLat === undefined ||
      !Number.isFinite(reqLat) ||
      reqLat < -90 ||
      reqLat > 90 ||
      reqLng === undefined ||
      !Number.isFinite(reqLng) ||
      reqLng < -180 ||
      reqLng > 180
    ) {
      throw new BadRequestException('Valid coordinates are required to load the feed.');
    }

    const params: FeedQueryParams = {
      ...(userId ? { userId } : {}),
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
