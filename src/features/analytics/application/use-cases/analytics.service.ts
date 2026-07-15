import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { AnalyticsEventType } from '../../../../../generated/prisma/client.js';

import { EventBusService } from '../../../../shared/events/event-bus.service.js';

export interface TrackEventDto {
  businessProfileId: string;
  eventType: AnalyticsEventType;
  listingId?: string | null;
  userId?: string | null;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async trackEvent(payload: TrackEventDto) {
    const event = await this.prisma.analyticsEvent.create({
      data: {
        businessProfileId: payload.businessProfileId,
        eventType: payload.eventType,
        listingId: payload.listingId ?? null,
        userId: payload.userId ?? null,
      },
    });

    await this.eventBus.publish('analytics.event.created', {
      eventType: event.eventType,
      businessProfileId: event.businessProfileId,
      listingId: event.listingId,
    });

    return event;
  }

  async getDashboardAnalytics(businessId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total conversations
    const totalInquiries = await this.prisma.conversation.count({
      where: { anchor: { businessId } },
    });

    // Get total saves
    const savedBusinesses = await this.prisma.businessFollow.count({
      where: { businessId },
    });

    // Also include listings saves
    const listingsSaves = await this.prisma.savedListing.count({
      where: { listing: { businessProfileId: businessId } },
    });

    const totalSaves = savedBusinesses + listingsSaves;

    // Get profile views
    const totalProfileViews = await this.prisma.analyticsEvent.count({
      where: { businessProfileId: businessId, eventType: 'PROFILE_VIEW' },
    });

    const totalListingViews = await this.prisma.analyticsEvent.count({
      where: { businessProfileId: businessId, eventType: 'LISTING_VIEW' },
    });

    // Generate chart data for last 30 days
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        businessProfileId: businessId,
        eventType: { in: ['PROFILE_VIEW', 'LISTING_VIEW'] },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    // Group by day (YYYY-MM-DD)
    const grouped = events.reduce(
      (acc: Record<string, number>, ev) => {
        const dateStr = ev.createdAt.toISOString().substring(0, 10);
        acc[dateStr] = (acc[dateStr] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Ensure all 30 days have a value, even if 0
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      chartData.push({
        date: dateStr,
        views: grouped[dateStr] || 0,
      });
    }

    return {
      totalProfileViews,
      totalListingViews,
      totalInquiries,
      totalSaves,
      chartData,
    };
  }
}
