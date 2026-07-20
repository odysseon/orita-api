import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  OptionalAuth,
  CurrentIdentity,
  type RequestIdentity,
} from '@odysseon/whoami-adapter-nestjs';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { DiscoverBusinessesUseCase } from '../../application/use-cases/discover-businesses.use-case.js';
import { GetPublicBusinessProfileUseCase } from '../../application/use-cases/get-public-business-profile.use-case.js';
import { GetTagsUseCase } from '../../application/use-cases/get-tags.use-case.js';
import { GetBusinessesQueryDto } from '../dto/request.dto.js';
import { BusinessProfileResponseDto, PaginatedBusinessesResponseDto } from '../dto/response.dto.js';
import { TagDto } from '../dto/tag.dto.js';
import { ApiTags , ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('businesses public access')
@ApiBearerAuth()
@OptionalAuth()
@Controller('businesses')
export class PublicBusinessProfileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discoverBusinesses: DiscoverBusinessesUseCase,
    private readonly getPublicBusinessProfile: GetPublicBusinessProfileUseCase,
    private readonly getTags: GetTagsUseCase,
  ) {}

  @Get()
  async discover(
    @Query() query: GetBusinessesQueryDto,
    @CurrentIdentity({ required: false }) identity?: RequestIdentity,
  ): Promise<PaginatedBusinessesResponseDto> {
    let currentUserId: string | undefined;
    const accountId = identity?.accountId;

    if (accountId) {
      const user = await this.prisma.user.findUnique({
        where: { accountId },
        select: { id: true },
      });
      if (user) {
        currentUserId = user.id;
      }
    }

    const result = await this.discoverBusinesses.execute({
      ...query,
      ...(currentUserId ? { currentUserId } : {}),
    });
    return PaginatedBusinessesResponseDto.from(result);
  }

  @Get('tags/all')
  async getAllTags(): Promise<TagDto[]> {
    const tags = await this.getTags.execute();
    return tags.map((t) => TagDto.from(t));
  }

  @Get(':slug')
  async getBySlug(
    @Param('slug') slug: string,
    @CurrentIdentity({ required: false }) identity?: RequestIdentity,
  ): Promise<BusinessProfileResponseDto> {
    let currentUserId: string | undefined;
    const accountId = identity?.accountId;

    if (accountId) {
      const user = await this.prisma.user.findUnique({
        where: { accountId },
        select: { id: true },
      });
      if (user) {
        currentUserId = user.id;
      }
    }
    const profile = await this.getPublicBusinessProfile.execute(slug, currentUserId);
    return BusinessProfileResponseDto.from(profile);
  }
}
