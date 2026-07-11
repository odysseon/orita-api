import { Injectable } from '@nestjs/common';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ISavesRepository, SavedListingView } from '../domain/ports/saves.repository.port.js';

@Injectable()
export class PrismaSavesRepository implements ISavesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  async saveListing(userId: string, listingId: string): Promise<void> {
    await this.prisma.savedListing.upsert({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
      update: {},
      create: {
        userId,
        listingId,
      },
    });
  }

  async unsaveListing(userId: string, listingId: string): Promise<void> {
    await this.prisma.savedListing
      .delete({
        where: {
          userId_listingId: {
            userId,
            listingId,
          },
        },
      })
      .catch(() => {
        // Ignore if it doesn't exist
      });
  }

  async isListingSaved(userId: string, listingId: string): Promise<boolean> {
    const count = await this.prisma.savedListing.count({
      where: { userId, listingId },
    });
    return count > 0;
  }

  async getSavedListings(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ items: SavedListingView[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.savedListing.findMany({
        where: { userId },
        include: {
          listing: {
            include: {
              media: {
                orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.savedListing.count({ where: { userId } }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      listingId: r.listingId,
      createdAt: r.createdAt,
      listing: {
        id: r.listing.id,
        businessProfileId: r.listing.businessProfileId,
        title: r.listing.title,
        slug: r.listing.slug,
        description: r.listing.description,
        status: r.listing.status,
        minPrice: r.listing.minPrice ? r.listing.minPrice.toNumber() : null,
        maxPrice: r.listing.maxPrice ? r.listing.maxPrice.toNumber() : null,
        currencyCode: r.listing.currencyCode,
        isNegotiable: r.listing.isNegotiable,
        createdAt: r.listing.createdAt,
        updatedAt: r.listing.updatedAt,
        coverUrl: r.listing.media[0]
          ? this.mediaUrlService.getMediaUrl(
              r.listing.media[0].provider,
              r.listing.media[0].fileId,
              r.listing.media[0].mimeType,
              r.listing.media[0].version,
              r.listing.media[0].format,
            )
          : undefined,
      },
    }));

    return { items, total };
  }
}
