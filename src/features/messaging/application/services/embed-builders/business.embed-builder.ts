import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessageEmbedType } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../prisma/prisma.service.js';
import { MediaUrlService } from '../../../../media/application/services/media-url.service.js';
import { EmbedSnapshot } from '../../../domain/types/messaging.types.js';
import { IEmbedBuilder } from './embed-builder.interface.js';

@Injectable()
export class BusinessEmbedBuilder implements IEmbedBuilder {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  supports(type: MessageEmbedType): boolean {
    return type === 'BUSINESS';
  }

  async build(targetId: string): Promise<EmbedSnapshot> {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id: targetId },
      include: {
        media: {
          where: { role: 'LOGO' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!business) {
      throw new BadRequestException('Business not found');
    }

    if (!business.isPublic) {
      throw new ForbiddenException('Cannot share an unpublished business');
    }

    let imageUrl = null;
    if (business.media.length > 0) {
      const m = business.media[0];
      if (m) {
        imageUrl = this.mediaUrlService.getMediaUrl(
          m.provider,
          m.fileId,
          m.mimeType,
          m.version,
          m.format,
        );
      }
    }

    return {
      title: business.name,
      subtitle: 'Business',
      imageUrl,
      ctaLabel: 'View Business',
      ctaPath: `/b/${business.slug}`,
    };
  }
}
