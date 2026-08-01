import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessageEmbedType } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../prisma/prisma.service.js';
import { MediaUrlService } from '../../../../media/application/services/media-url.service.js';
import { EmbedSnapshot } from '../../../domain/types/messaging.types.js';
import { IEmbedBuilder } from './embed-builder.interface.js';

@Injectable()
export class OpportunityEmbedBuilder implements IEmbedBuilder {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  supports(type: MessageEmbedType): boolean {
    return type === 'OPPORTUNITY';
  }

  async build(targetId: string): Promise<EmbedSnapshot> {
    const opp = await this.prisma.opportunityPost.findUnique({
      where: { id: targetId },
      include: {
        media: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!opp) {
      throw new BadRequestException('Opportunity not found');
    }

    if (opp.status === 'DELETED') {
      throw new ForbiddenException('Cannot share a deleted opportunity');
    }

    let imageUrl = null;
    if (opp.media.length > 0) {
      const m = opp.media[0];
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

    // Determine subtitle based on status or type
    let subtitle = opp.body ?? 'Opportunity Post';
    if (opp.status === 'EXPIRED') {
      subtitle = 'This opportunity has expired';
    } else if (opp.status === 'COMPLETED') {
      subtitle = 'This opportunity has been completed';
    }

    return {
      title: opp.title,
      subtitle: subtitle,
      imageUrl,
      ctaLabel: 'View Opportunity',
      ctaPath: `/opportunities/${opp.id}`,
    };
  }
}
