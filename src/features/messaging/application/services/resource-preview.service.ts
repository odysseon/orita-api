import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';

import { MessageEmbedType } from '../../../../../generated/prisma/client.js';

export interface ResourcePreviewEmbed {
  embedType: MessageEmbedType;
  targetId: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaPath?: string;
}

@Injectable()
export class ResourcePreviewService {
  constructor(private readonly prisma: PrismaService) {}

  async extractPreviews(content: string | undefined): Promise<ResourcePreviewEmbed[]> {
    if (!content) return [];

    const embeds: ResourcePreviewEmbed[] = [];

    // Also support localhost and render domains for testing
    const genericBusinessRegex = /\/b\/([a-zA-Z0-9-]+)(?:\/|\s|$)/g;
    const genericListingRegex = /\/l\/([a-zA-Z0-9-]+)(?:\/|\s|$)/g;

    const bMatch = [...content.matchAll(genericBusinessRegex)];
    for (const match of bMatch) {
      const slug = match[1] as string;
      const business = await this.prisma.businessProfile.findUnique({
        where: { slug },
        select: { id: true, name: true, description: true, slug: true },
      });

      if (business && !embeds.find((e) => e.targetId === business.id)) {
        // Find avatar separately for simplicity here (or could join Media)
        const media = await this.prisma.media.findFirst({
          where: { businessProfileId: business.id, role: 'LOGO' },
          orderBy: { createdAt: 'desc' },
        });

        // Construct the image URL if media exists (would normally use MediaUrlService)
        let imageUrl: string | undefined = undefined;
        if (media) {
          imageUrl = `https://res.cloudinary.com/${process.env['CLOUDINARY_CLOUD_NAME'] || 'demo'}/image/upload/v${media.version}/${media.fileId}.${media.format}`;
        }

        const embed: ResourcePreviewEmbed = {
          embedType: 'BUSINESS',
          targetId: business.id,
          title: business.name,
          subtitle: business.description || 'View business profile',
          ctaLabel: 'View Business',
          ctaPath: `/b/${business.slug}`,
        };
        if (imageUrl) embed.imageUrl = imageUrl;
        embeds.push(embed);
      }
    }

    const lMatch = [...content.matchAll(genericListingRegex)];
    for (const match of lMatch) {
      const slug = match[1] as string;
      const listing = await this.prisma.listing.findFirst({
        where: { slug },
        select: {
          id: true,
          title: true,
          description: true,
          slug: true,
          businessProfile: { select: { slug: true } },
        },
      });

      if (listing && !embeds.find((e) => e.targetId === listing.id)) {
        // We'd ideally fetch gallery media, but for MVP, we'll keep it simple
        embeds.push({
          embedType: 'LISTING',
          targetId: listing.id,
          title: listing.title,
          subtitle: listing.description || 'View listing details',
          ctaLabel: 'View Listing',
          ctaPath: `/b/${listing.businessProfile.slug}/l/${listing.slug}`,
        });
      }
    }

    return embeds;
  }
}
