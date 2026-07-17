import { Injectable, BadRequestException } from '@nestjs/common';
import { MessageEmbedType } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../prisma/prisma.service.js';
import { EmbedSnapshot } from '../../../domain/types/messaging.types.js';
import { IEmbedBuilder } from './embed-builder.interface.js';

@Injectable()
export class LocationEmbedBuilder implements IEmbedBuilder {
  constructor(private readonly prisma: PrismaService) {}

  supports(type: MessageEmbedType): boolean {
    return type === 'LOCATION';
  }

  async build(targetId: string): Promise<EmbedSnapshot> {
    const location = await this.prisma.location.findUnique({
      where: { id: targetId },
    });

    if (!location) {
      throw new BadRequestException('Location not found');
    }

    return {
      title: location.name,
      subtitle: location.formattedAddress || 'View on map',
      imageUrl: null, // Locations might not have a direct image in this MVP
      ctaLabel: 'View Location',
      ctaPath: `/locations/${location.id}`,
    };
  }
}
