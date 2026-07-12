import { Module } from '@nestjs/common';
import { SeoController } from './api/controllers/seo.controller.js';
import { SeoService } from './core/services/seo.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
