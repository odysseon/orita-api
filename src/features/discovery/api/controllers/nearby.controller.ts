import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryService } from '../../application/services/discovery.service.js';
import { NearbyQueryDto } from '../dto/nearby-query.dto.js';
import { IdentityService } from '../../../../shared/identity/identity.service.js';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('discovery')
@ApiBearerAuth()
@Controller('nearby')
export class NearbyController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly identityService: IdentityService,
  ) {}

  @Get()
  async getNearby(@CurrentIdentity() identity: RequestIdentity, @Query() query: NearbyQueryDto) {
    let viewerId: string | undefined;
    if (identity) {
      const user = await this.identityService.resolveUserOrThrow(identity.accountId);
      viewerId = user.id;
    }
    return this.discoveryService.getNearby({ ...query, ...(viewerId ? { viewerId } : {}) });
  }
}
