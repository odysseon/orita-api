import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSitemap(baseUrl: string): Promise<string> {
    const urls: { loc: string; lastmod: Date; priority: number }[] = [];

    // Static pages
    const staticPages = [
      '',
      '/home',
      '/tours',
      '/auth/login',
      '/auth/register',
      '/legal/terms',
      '/legal/privacy',
      '/legal/cookies',
      '/legal/community',
    ];

    staticPages.forEach((page) => {
      urls.push({
        loc: `${baseUrl}${page}`,
        lastmod: new Date(),
        priority: page === '' ? 1.0 : 0.8,
      });
    });

    // Public Businesses
    const businesses = await this.prisma.businessProfile.findMany({
      where: { isPublic: true },
      select: { slug: true, updatedAt: true },
    });

    businesses.forEach((b) => {
      urls.push({
        loc: `${baseUrl}/b/${b.slug}`,
        lastmod: b.updatedAt,
        priority: 0.9,
      });
    });

    // Published Listings
    const listings = await this.prisma.listing.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true, businessProfile: { select: { slug: true } } },
    });

    listings.forEach((l) => {
      urls.push({
        loc: `${baseUrl}/b/${l.businessProfile.slug}/l/${l.slug}`,
        lastmod: l.updatedAt,
        priority: 0.8,
      });
    });

    const xmlUrls = urls
      .map(
        (u) => `
    <url>
      <loc>${u.loc}</loc>
      <lastmod>${u.lastmod.toISOString()}</lastmod>
      <priority>${u.priority.toFixed(1)}</priority>
    </url>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;
  }
}
