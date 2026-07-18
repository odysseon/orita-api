import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ShareableSearchResultDto } from '../../sharing/api/dto/response.dto.js';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';
import { StorageProvider } from '../../../../generated/prisma/client.js';

@Injectable()
export class ShareableSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  async search(query: string): Promise<ShareableSearchResultDto[]> {
    const q = query.trim();
    if (!q) return [];

    const results: ShareableSearchResultDto[] = [];

    // Quick and simple search for businesses, listings, tours containing the query
    // In a real app this might use Elasticsearch, but here we'll do naive ILIKE

    // 1. Businesses
    const businesses = await this.prisma.businessProfile.findMany({
      where: {
        isPublic: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        media: { where: { role: 'LOGO' } },
        geoEntity: true,
      },
      take: 5,
    });

    for (const b of businesses) {
      const imageUrl = this.getMediaUrl(b.media?.[0]);
      const subtitle = b.geoEntity?.formattedAddress || 'Business';
      results.push({
        type: 'BUSINESS',
        targetId: b.id,
        title: b.name,
        ...(subtitle ? { subtitle } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      });
    }

    // 2. Listings
    const listings = await this.prisma.listing.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        media: { where: { role: 'COVER' } },
        businessProfile: true,
      },
      take: 5,
    });

    for (const l of listings) {
      const imageUrl = this.getMediaUrl(l.media?.[0]);
      const subtitle = l.businessProfile.name;
      results.push({
        type: 'LISTING',
        targetId: l.id,
        title: l.title,
        ...(subtitle ? { subtitle } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      });
    }

    // 3. Tours
    const tours = await this.prisma.businessTour.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        media: { where: { role: 'GALLERY' } },
        businessProfile: true,
      },
      take: 5,
    });

    for (const t of tours) {
      const imageUrl = this.getMediaUrl(t.media?.[0]);
      const subtitle = t.businessProfile.name;
      results.push({
        type: 'TOUR',
        targetId: t.id,
        title: t.title,
        ...(subtitle ? { subtitle } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      });
    }

    // Shuffle/interleave or just return them flat (could add better ranking here)
    return results;
  }

  private getMediaUrl(media?: any): string | undefined {
    if (!media) return undefined;
    const m = media as {
      provider: StorageProvider;
      fileId: string;
      mimeType: string;
      version?: string | null;
      format?: string | null;
    };
    return this.mediaUrlService.getMediaUrl(m.provider, m.fileId, m.mimeType, m.version, m.format);
  }
}
