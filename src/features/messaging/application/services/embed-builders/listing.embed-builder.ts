import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessageEmbedType } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../prisma/prisma.service.js';
import { MediaUrlService } from '../../../../media/application/services/media-url.service.js';
import { EmbedSnapshot } from '../../../domain/types/messaging.types.js';
import { IEmbedBuilder } from './embed-builder.interface.js';

@Injectable()
export class ListingEmbedBuilder implements IEmbedBuilder {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  supports(type: MessageEmbedType): boolean {
    return type === 'LISTING';
  }

  async build(targetId: string): Promise<EmbedSnapshot> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: targetId },
      include: {
        media: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!listing) {
      throw new BadRequestException('Listing not found');
    }

    if (listing.status !== 'PUBLISHED') {
      throw new ForbiddenException('Cannot share an unpublished listing');
    }

    let imageUrl = null;
    if (listing.media.length > 0) {
      const m = listing.media[0];
      if (m) {
        imageUrl = this.mediaUrlService.getMediaUrl(m.provider, m.fileId, m.mimeType, m.version, m.format);
      }
    }

    return {
      title: listing.title,
      subtitle: listing.minPrice ? `₦${listing.minPrice.toLocaleString()}` : 'Contact for price',
      imageUrl,
      ctaLabel: 'View Listing',
      ctaPath: `/l/${listing.id}`,
    };
  }
}
