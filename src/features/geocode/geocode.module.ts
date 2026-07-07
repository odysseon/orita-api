import { Module } from '@nestjs/common';
import { GeocodeController } from './geocode.controller.js';

@Module({
  controllers: [GeocodeController],
})
export class GeocodeModule {}
