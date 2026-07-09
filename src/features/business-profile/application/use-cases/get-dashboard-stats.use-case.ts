import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(businessId: string, ownerId: string) {
    // 1. Verify ownership and existence
    const profile = await this.prisma.businessProfile.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!profile) {
      throw new NotFoundException('Business profile not found.');
    }

    if (profile.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have permission to view stats for this business.');
    }

    // 2. Aggregate stats
    const totalListings = await this.prisma.listing.count({
      where: { businessProfileId: businessId },
    });

    // We can count total views from AnalyticsEvent
    const profileViews = await this.prisma.analyticsEvent.count({
      where: { businessProfileId: businessId, eventType: 'PROFILE_VIEW' },
    });

    const totalSaves = await this.prisma.follow.count({
      where: { businessId },
    });

    const totalContactClicks = await this.prisma.analyticsEvent.count({
      where: {
        businessProfileId: businessId,
        eventType: { in: ['PHONE_CLICK', 'WEBSITE_CLICK', 'DIRECTIONS_CLICK'] },
      },
    });

    return {
      totalListings,
      profileViews,
      totalSaves,
      totalContactClicks,
    };
  }
}
