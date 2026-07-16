import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IListingRepository } from '../../domain/ports/listing.repository.port.js';
import { ListingStatus } from '../../domain/types/listing-status.enum.js';
import { Listing } from '../../domain/types/listing.entity.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class GetPublicListingUseCase {
  constructor(
    private readonly repo: IListingRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string, currentUserId?: string): Promise<Listing & { isSaved?: boolean; businessProfileSlug?: string }> {
    // If it looks like a CUID (25 chars, starts with 'c'), reject it as bad request
    if (slug.startsWith('c') && slug.length >= 24) {
      throw new BadRequestException('Public calls must use the listing slug, not the ID.');
    }
    const listing = await this.repo.findBySlug(slug);

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const bp = await this.prisma.businessProfile.findUnique({
      where: { id: listing.businessProfileId },
      select: { ownerId: true, slug: true },
    });

    if (!bp) {
      throw new NotFoundException('Business profile not found.');
    }

    if (listing.status !== ListingStatus.PUBLISHED) {
      if (!currentUserId || bp.ownerId !== currentUserId) {
        throw new NotFoundException('Listing not found.');
      }
    }

    let isSaved = false;
    if (currentUserId) {
      const saveCount = await this.prisma.savedListing.count({
        where: { userId: currentUserId, listingId: listing.id },
      });
      isSaved = saveCount > 0;
    }

    return { ...listing, isSaved, businessProfileSlug: bp.slug };
  }
}
