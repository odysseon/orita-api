import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessageEmbedType } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../prisma/prisma.service.js';
import { MediaUrlService } from '../../../../media/application/services/media-url.service.js';
import { EmbedSnapshot } from '../../../domain/types/messaging.types.js';
import { IEmbedBuilder } from './embed-builder.interface.js';

@Injectable()
export class TourEmbedBuilder implements IEmbedBuilder {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  supports(type: MessageEmbedType): boolean {
    return type === 'TOUR';
  }

  async build(targetId: string): Promise<EmbedSnapshot> {
    const tour = await this.prisma.businessTour.findUnique({
      where: { id: targetId },
      include: {
        media: true,
      },
    });

    if (!tour) {
      throw new BadRequestException('Tour not found');
    }

    if (tour.status !== 'PUBLISHED') {
      throw new ForbiddenException('Cannot share an unpublished tour');
    }

    let imageUrl = null;
    if (tour.media.length > 0) {
      const m = tour.media[0];
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
      title: tour.title,
      subtitle: tour.summary || 'Experience this tour',
      imageUrl,
      ctaLabel: 'Watch Tour',
      ctaPath: `/t/${tour.id}`,
    };
  }
}
