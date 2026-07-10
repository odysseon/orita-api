import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { ConversationAnchor } from '../../../../../generated/prisma/client.js';
import { ConversationAnchorView } from '../../domain/types/messaging.types.js';

@Injectable()
export class AnchorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the anchor entity, captures the snapshot, and creates a ConversationAnchor.
   */
  async createAnchor(input: { type: string; targetId: string }): Promise<ConversationAnchor> {
    let businessId: string | null = null;
    let listingId: string | null = null;
    let tourId: string | null = null;
    let locationId: string | null = null;
    let title = '';
    let subtitle: string | null = null;
    let imageUrl: string | null = null;

    switch (input.type.toUpperCase()) {
      case 'BUSINESS': {
        const b = await this.prisma.businessProfile.findUnique({
          where: { id: input.targetId },
          include: { media: { take: 1, orderBy: { createdAt: 'asc' } } },
        });
        if (!b) throw new BadRequestException('Business not found for anchor');
        businessId = b.id;
        title = b.name;
        subtitle = b.description ?? null;
        imageUrl = b.media[0]?.url ?? null;
        break;
      }
      case 'LISTING': {
        const l = await this.prisma.listing.findUnique({
          where: { id: input.targetId },
          include: { businessProfile: true, media: { take: 1, orderBy: { createdAt: 'asc' } } },
        });
        if (!l) throw new BadRequestException('Listing not found for anchor');
        listingId = l.id;
        title = l.title;
        subtitle = l.businessProfile.name;
        imageUrl = l.media[0]?.url ?? null;
        break;
      }
      case 'TOUR': {
        const t = await this.prisma.businessTour.findUnique({
          where: { id: input.targetId },
          include: { businessProfile: true, media: { take: 1, orderBy: { createdAt: 'asc' } } },
        });
        if (!t) throw new BadRequestException('Tour not found for anchor');
        tourId = t.id;
        title = t.title;
        subtitle = t.businessProfile.name;
        imageUrl = t.media[0]?.url ?? null;
        break;
      }
      case 'LOCATION': {
        const loc = await this.prisma.location.findUnique({
          where: { id: input.targetId },
        });
        if (!loc) throw new BadRequestException('Location not found for anchor');
        locationId = loc.id;
        title = loc.name;
        subtitle = loc.formattedAddress ?? null;
        break;
      }
      default:
        throw new BadRequestException(`Unsupported anchor type: ${input.type}`);
    }

    return this.prisma.conversationAnchor.create({
      data: {
        businessId,
        listingId,
        tourId,
        locationId,
        title,
        subtitle,
        imageUrl,
      },
    });
  }

  /**
   * Resolves an anchor for rendering. Returns the immutable snapshot fields alongside live foreign keys.
   */
  mapToView(anchor: ConversationAnchor): ConversationAnchorView {
    return {
      id: anchor.id,
      title: anchor.title,
      subtitle: anchor.subtitle,
      imageUrl: anchor.imageUrl,
      businessId: anchor.businessId,
      listingId: anchor.listingId,
      tourId: anchor.tourId,
      locationId: anchor.locationId,
    };
  }
}
