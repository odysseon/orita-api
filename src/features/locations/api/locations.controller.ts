import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { LocationsService } from '../application/locations.service.js';

class EnsureLocationDto {
  externalId!: string;
  provider!: string;
  name!: string;
  formattedAddress!: string;
  lat!: number;
  lng!: number;
}

@ApiTags('Locations')
@Controller('v1/locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for locations' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  async search(@Query('q') q: string) {
    if (!q || !q.trim()) {
      return [];
    }
    return this.locationsService.search(q);
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Reverse geocode coordinates' })
  @ApiQuery({ name: 'lat', required: true, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, description: 'Longitude' })
  async reverse(@Query('lat') lat: string, @Query('lon') lon: string) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      throw new BadRequestException('Invalid latitude or longitude');
    }

    const location = await this.locationsService.reverseGeocode(latNum, lonNum);
    if (!location) {
      throw new NotFoundException('Location not found at these coordinates');
    }
    return location;
  }

  @Post('ensure')
  @ApiOperation({ summary: 'Ensure a location is persisted from geocoder results' })
  @ApiBody({ type: EnsureLocationDto })
  async ensure(@Body() dto: EnsureLocationDto) {
    if (
      !dto.provider ||
      !dto.externalId ||
      !dto.name ||
      dto.lat === undefined ||
      dto.lng === undefined
    ) {
      throw new BadRequestException('Missing required fields for location ensure');
    }
    return this.locationsService.ensure(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a location by ID' })
  async getById(@Param('id') id: string) {
    const location = await this.locationsService.findById(id);
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }
}
