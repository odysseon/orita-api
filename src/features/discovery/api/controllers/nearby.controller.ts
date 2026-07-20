import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { DiscoveryService } from '../../application/services/discovery.service.js';
import { NearbyQueryDto } from '../dto/nearby-query.dto.js';
import { ApiTags , ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('discovery')
@ApiBearerAuth()
@Controller('nearby')
export class NearbyController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getNearby(@Query() query: NearbyQueryDto) {
    return this.discoveryService.getNearby(query);
  }
}
