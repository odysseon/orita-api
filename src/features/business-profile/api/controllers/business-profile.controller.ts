import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { DeleteBusinessProfileUseCase } from '../../application/use-cases/delete-business-profile.use-case.js';
import { GetMyBusinessProfileUseCase } from '../../application/use-cases/get-my-business-profile.use-case.js';
import { UpdateBusinessProfileUseCase } from '../../application/use-cases/update-business-profile.use-case.js';
import { CreateBusinessProfileUseCase } from '../../application/use-cases/create-business-profile.use-case.js';
import { SetOperatingHoursUseCase } from '../../application/use-cases/set-operating-hours.use-case.js';
import { SetBusinessTagsUseCase } from '../../application/use-cases/set-business-tags.use-case.js';
import { GetDashboardStatsUseCase } from '../../application/use-cases/get-dashboard-stats.use-case.js';
import {
  CreateBusinessProfileDto,
  UpdateBusinessProfileDto,
} from '../dto/request.dto.js';
import { BusinessProfileResponseDto, DashboardStatsResponseDto } from '../dto/response.dto.js';
import { SetOperatingHoursDto } from '../dto/operating-hours.dto.js';
import { SetTagsDto } from '../dto/tag.dto.js';
import { IdentityService } from '../../../../shared/identity/identity.service.js';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('business management')
@Controller()
export class BusinessProfileController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly createBusinessProfile: CreateBusinessProfileUseCase,
    private readonly updateBusinessProfile: UpdateBusinessProfileUseCase,
    private readonly deleteBusinessProfile: DeleteBusinessProfileUseCase,
    private readonly getMyBusinessProfile: GetMyBusinessProfileUseCase,
    private readonly setOperatingHours: SetOperatingHoursUseCase,
    private readonly setBusinessTags: SetBusinessTagsUseCase,
    private readonly getDashboardStats: GetDashboardStatsUseCase,
  ) {}

  @Post('business')
  async createProfile(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() dto: CreateBusinessProfileDto,
  ): Promise<BusinessProfileResponseDto> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    const profile = await this.createBusinessProfile.execute({
      ownerId: user.id,
      ...dto,
    });
    return BusinessProfileResponseDto.from(profile);
  }



  @Patch('business/:id')
  async update(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessProfileDto,
  ): Promise<BusinessProfileResponseDto> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);

    const profile = await this.updateBusinessProfile.execute(id, user.id, {
      ...dto,
    });

    return BusinessProfileResponseDto.from(profile);
  }

  @Delete('business/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
  ): Promise<void> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    await this.deleteBusinessProfile.execute(id, user.id);
  }

  @Get('users/me/business')
  async getMyProfile(
    @CurrentIdentity() identity: RequestIdentity,
  ): Promise<BusinessProfileResponseDto> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    const profile = await this.getMyBusinessProfile.execute(user.id);
    if (!profile) {
      throw new NotFoundException('You do not have a business profile.');
    }
    return BusinessProfileResponseDto.from(profile);
  }

  @Get('business/:id/dashboard-stats')
  async getStats(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
  ): Promise<DashboardStatsResponseDto> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    const stats = await this.getDashboardStats.execute(id, user.id);
    return stats;
  }

  @Put('business/:id/hours')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateHours(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
    @Body() dto: SetOperatingHoursDto,
  ): Promise<void> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    const isAdmin = user.role === 'ADMIN';
    await this.setOperatingHours.execute(id, dto.hours, user.id, isAdmin);
  }

  @Put('business/:id/tags')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateTags(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
    @Body() dto: SetTagsDto,
  ): Promise<void> {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    const isAdmin = user.role === 'ADMIN';
    await this.setBusinessTags.execute(id, dto.tagIds, user.id, isAdmin);
  }
}
