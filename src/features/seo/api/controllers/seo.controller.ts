import { Controller, Get, Header } from '@nestjs/common';
import { SeoService } from '../../core/services/seo.service.js';
import { Public } from '@odysseon/whoami-adapter-nestjs';

@Public()
@Controller('sitemap')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get()
  @Header('Content-Type', 'application/xml')
  async getSitemap() {
    const baseUrl = process.env['FRONTEND_URL'] || 'https://orita.onrender.com';
    return this.seoService.generateSitemap(baseUrl);
  }
}
