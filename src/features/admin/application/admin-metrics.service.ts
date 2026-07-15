import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class AdminMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformMetrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalAccounts,
      newAccountsLast30Days,
      totalUsers,
      totalBusinessProfiles,
      publishedBusinesses,
      verifiedBusinesses,
      totalListings,
      publishedListings,
      draftListings,
      pausedListings,
      archivedListings,
      newListingsLast30Days,
      totalInquiries,
      totalSavedListings,
      totalSavedBusinesses,
      totalAnalyticsEvents,
      profileViewsLast30Days,
      listingViewsLast30Days,
    ] = await Promise.all([
      // Accounts
      this.prisma.account.count(),
      this.prisma.account.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // Users
      this.prisma.user.count(),

      // Business Profiles
      this.prisma.businessProfile.count(),
      this.prisma.businessProfile.count({ where: { isPublic: true } }),
      this.prisma.businessProfile.count({ where: { verification: { status: 'VERIFIED' } } }),

      // Listings
      this.prisma.listing.count(),
      this.prisma.listing.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.listing.count({ where: { status: 'DRAFT' } }),
      this.prisma.listing.count({ where: { status: 'PAUSED' } }),
      this.prisma.listing.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.listing.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // Engagement
      this.prisma.conversation.count(),
      this.prisma.savedListing.count(),
      this.prisma.businessFollow.count(),

      // Analytics
      this.prisma.analyticsEvent.count(),
      this.prisma.analyticsEvent.count({
        where: { eventType: 'PROFILE_VIEW', createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.analyticsEvent.count({
        where: { eventType: 'LISTING_VIEW', createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Daily growth chart for new accounts (last 30 days)
    const recentAccounts = await this.prisma.account.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const accountsChart = this.buildDailyChart(recentAccounts.map((a) => a.createdAt));

    return {
      accounts: {
        total: totalAccounts,
        newLast30Days: newAccountsLast30Days,
        chart: accountsChart,
      },
      users: {
        total: totalUsers,
      },
      businesses: {
        total: totalBusinessProfiles,
        published: publishedBusinesses,
        verified: verifiedBusinesses,
        unpublished: totalBusinessProfiles - publishedBusinesses,
      },
      listings: {
        total: totalListings,
        published: publishedListings,
        draft: draftListings,
        paused: pausedListings,
        archived: archivedListings,
        newLast30Days: newListingsLast30Days,
      },
      engagement: {
        totalInquiries,
        totalSaves: totalSavedListings + totalSavedBusinesses,
        savedListings: totalSavedListings,
        savedBusinesses: totalSavedBusinesses,
      },
      analytics: {
        totalEvents: totalAnalyticsEvents,
        profileViewsLast30Days,
        listingViewsLast30Days,
      },
    };
  }

  private buildDailyChart(dates: Date[]): Array<{ date: string; count: number }> {
    const grouped = dates.reduce((acc: Record<string, number>, date) => {
      const key = date.toISOString().substring(0, 10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const chart = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().substring(0, 10);
      chart.push({ date: key, count: grouped[key] || 0 });
    }
    return chart;
  }
}
