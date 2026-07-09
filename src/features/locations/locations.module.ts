import { Module } from '@nestjs/common';
import { LocationsController } from './api/locations.controller.js';
import { LocationsService } from './application/locations.service.js';
import { PrismaLocationRepository } from './infrastructure/prisma-location.repository.js';
import { Geocoder } from './infrastructure/geocoder.interface.js';
import { NominatimGeocoder } from './infrastructure/nominatim.geocoder.js';

@Module({
  controllers: [LocationsController],
  providers: [
    LocationsService,
    PrismaLocationRepository,
    {
      provide: Geocoder,
      useClass: NominatimGeocoder,
    },
  ],
  exports: [LocationsService],
})
export class LocationsModule {}
