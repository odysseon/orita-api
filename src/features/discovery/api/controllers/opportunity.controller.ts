import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OpportunityService } from '../../application/services/opportunity.service.js';
import { CreateOpportunityDto, UpdateOpportunityDto } from '../dto/opportunity-request.dto.js';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { IdentityService } from '../../../../shared/identity/identity.service.js';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('opportunities')
@ApiBearerAuth()
@Controller('opportunities')
export class OpportunityController {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly identityService: IdentityService,
  ) {}

  @Post()
  async create(@CurrentIdentity() identity: RequestIdentity, @Body() dto: CreateOpportunityDto) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.opportunityService.create(user.id, dto);
  }

  @Get('mine')
  async getMyPosts(@CurrentIdentity() identity: RequestIdentity) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.opportunityService.getMyPosts(user.id);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentIdentity() identity: RequestIdentity) {
    let viewerId: string | undefined;
    if (identity) {
      const user = await this.identityService.resolveUserOrThrow(identity.accountId);
      viewerId = user.id;
    }
    return this.opportunityService.getById(id, viewerId);
  }

  @Patch(':id')
  async update(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.opportunityService.update(user.id, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':id/complete')
  async complete(@CurrentIdentity() identity: RequestIdentity, @Param('id') id: string) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.opportunityService.complete(user.id, id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@CurrentIdentity() identity: RequestIdentity, @Param('id') id: string) {
    const user = await this.identityService.resolveUserOrThrow(identity.accountId);
    return this.opportunityService.delete(user.id, id);
  }
}
