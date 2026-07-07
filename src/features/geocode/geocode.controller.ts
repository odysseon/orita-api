import { Controller, Get, Query, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Geocoding')
@Controller('v1/geocode')
export class GeocodeController {
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org';
  // Use a custom user agent to comply with Nominatim ToS
  private readonly userAgent = 'OritaPulseAPI/1.0';

  @Get('search')
  @ApiOperation({ summary: 'Search for a location by address' })
  @ApiQuery({ name: 'q', required: true, description: 'Address to search for' })
  async search(@Query('q') q: string) {
    if (!q || !q.trim()) {
      return [];
    }

    try {
      const url = new URL(`${this.nominatimUrl}/search`);
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new InternalServerErrorException('Geocoding service unavailable');
      }

      return (await response.json()) as unknown;
    } catch {
      throw new InternalServerErrorException('Failed to search location');
    }
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Reverse geocode coordinates to an address' })
  @ApiQuery({ name: 'lat', required: true, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, description: 'Longitude' })
  async reverse(@Query('lat') lat: string, @Query('lon') lon: string) {
    if (!lat || !lon) {
      throw new InternalServerErrorException('Latitude and longitude are required');
    }

    try {
      const url = new URL(`${this.nominatimUrl}/reverse`);
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lon);
      url.searchParams.set('format', 'json');

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new InternalServerErrorException('Geocoding service unavailable');
      }

      return (await response.json()) as unknown;
    } catch {
      throw new InternalServerErrorException('Failed to reverse geocode coordinates');
    }
  }
}
