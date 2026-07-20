import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation , ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService, TrackEventDto } from '../../application/use-cases/analytics.service.js';
import { AnalyticsEventType } from '../../../../../generated/prisma/client.js';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';

export class TrackEventRequestDto {
  businessProfileId!: string;
  eventType!: AnalyticsEventType;
  listingId?: string;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('api')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('analytics/events')
  @ApiOperation({ summary: 'Track an analytics event' })
  async trackEvent(
    @Body() dto: TrackEventRequestDto,
    @CurrentIdentity() identity: RequestIdentity | undefined,
  ) {
    const payload: TrackEventDto = {
      businessProfileId: dto.businessProfileId,
      eventType: dto.eventType,
      listingId: dto.listingId ?? null,
      userId: identity?.accountId ?? null,
    };
    await this.analyticsService.trackEvent(payload);
    return { success: true };
  }

  @Get('businesses/:id/analytics')
  @ApiOperation({ summary: 'Get business analytics dashboard data' })
  async getDashboardAnalytics(@Param('id') businessId: string) {
    // In a real app, verify the user owns this businessId.
    return this.analyticsService.getDashboardAnalytics(businessId);
  }
}
