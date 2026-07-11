import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentIdentity, Public } from '@odysseon/whoami-adapter-nestjs';
import type { RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { CreateBusinessTourUseCase } from '../../application/use-cases/create-business-tour.use-case.js';
import { UpdateBusinessTourUseCase } from '../../application/use-cases/update-business-tour.use-case.js';
import { DeleteBusinessTourUseCase } from '../../application/use-cases/delete-business-tour.use-case.js';
import { GetBusinessTourUseCase } from '../../application/use-cases/get-business-tour.use-case.js';
import { GetBusinessToursByProfileUseCase } from '../../application/use-cases/get-business-tours-by-profile.use-case.js';
import { GetBusinessToursUseCase } from '../../application/use-cases/get-business-tours.use-case.js';
import { CreateBusinessTourDto, UpdateBusinessTourDto } from '../dto/request.dto.js';
import {
  BusinessTourResponseDto,
  PaginatedBusinessToursResponseDto,
  PaginatedBusinessToursSummaryResponseDto,
} from '../dto/response.dto.js';
import { BusinessTourStatus } from '../../domain/types/business-tour.entity.js';

import { ModeratorOrAdminGuard } from '../../../../shared/decorators/moderator-or-admin-guard.decorator.js';

@ApiTags('Store Tours')
@Controller()
export class BusinessTourController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createBusinessTour: CreateBusinessTourUseCase,
    private readonly updateBusinessTour: UpdateBusinessTourUseCase,
    private readonly deleteBusinessTour: DeleteBusinessTourUseCase,
    private readonly getBusinessTour: GetBusinessTourUseCase,
    private readonly getBusinessToursByProfile: GetBusinessToursByProfileUseCase,
    private readonly getBusinessTours: GetBusinessToursUseCase,
  ) {}

  @Post('business-profiles/:businessProfileId/business-tours')
  @ModeratorOrAdminGuard()
  async create(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('businessProfileId') businessProfileId: string,
    @Body() dto: CreateBusinessTourDto,
  ): Promise<BusinessTourResponseDto> {
    const createdById = await this.resolveUserId(identity.accountId);
    const tour = await this.createBusinessTour.execute({
      businessProfileId,
      title: dto.title,
      ...(dto.summary !== undefined && { summary: dto.summary }),
      visitDate: new Date(dto.visitDate),
      ...(dto.highlights !== undefined && { highlights: dto.highlights }),
      createdById,
    });
    return BusinessTourResponseDto.from(tour);
  }

  @Public()
  @Get('business-tours')
  async discoverGlobal(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BusinessTourStatus,
    @Query('search') search?: string,
    @Query('lat') latStr?: string,
    @Query('lng') lngStr?: string,
    @Query('radius') radiusStr?: string,
  ): Promise<PaginatedBusinessToursSummaryResponseDto> {
    const pageNum = parseInt(page ?? '1', 10);
    const limitNum = parseInt(limit ?? '20', 10);

    const lat = latStr ? parseFloat(latStr) : undefined;
    const lng = lngStr ? parseFloat(lngStr) : undefined;
    const radius = radiusStr ? parseFloat(radiusStr) : undefined;

    const paginated = await this.getBusinessTours.execute({
      ...(status !== undefined && { status }),
      ...(search !== undefined && { search }),
      ...(lat !== undefined && !isNaN(lat) && { lat }),
      ...(lng !== undefined && !isNaN(lng) && { lng }),
      ...(radius !== undefined && !isNaN(radius) && { radius }),
      page: isNaN(pageNum) ? 1 : pageNum,
      limit: isNaN(limitNum) ? 20 : limitNum,
    });
    return PaginatedBusinessToursSummaryResponseDto.from(paginated);
  }

  @Public()
  @Get('business-profiles/:businessProfileId/business-tours')
  async listByBusiness(
    @Param('businessProfileId') businessProfileId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BusinessTourStatus,
  ): Promise<PaginatedBusinessToursResponseDto> {
    const pageNum = parseInt(page ?? '1', 10);
    const limitNum = parseInt(limit ?? '20', 10);
    const paginated = await this.getBusinessToursByProfile.execute({
      businessProfileId,
      ...(status !== undefined && { status }),
      page: isNaN(pageNum) ? 1 : pageNum,
      limit: isNaN(limitNum) ? 20 : limitNum,
    });
    return PaginatedBusinessToursResponseDto.from(paginated);
  }

  @Public()
  @Get('business-tours/:id')
  async get(@Param('id') id: string): Promise<BusinessTourResponseDto> {
    const tour = await this.getBusinessTour.execute(id);
    return BusinessTourResponseDto.from(tour);
  }

  @Patch('business-tours/:id')
  @ModeratorOrAdminGuard()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessTourDto,
  ): Promise<BusinessTourResponseDto> {
    const tour = await this.updateBusinessTour.execute(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.summary !== undefined && { summary: dto.summary }),
      ...(dto.visitDate !== undefined && { visitDate: new Date(dto.visitDate) }),
      ...(dto.highlights !== undefined && { highlights: dto.highlights }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    return BusinessTourResponseDto.from(tour);
  }

  @Delete('business-tours/:id')
  @ModeratorOrAdminGuard()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.deleteBusinessTour.execute(id);
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
