import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';

export interface SavePushSubscriptionDto {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  platform?: string;
}

@Injectable()
export class PushSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async saveSubscription(userId: string, dto: SavePushSubscriptionDto): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: dto.userAgent ?? null,
        platform: dto.platform ?? null,
      },
      update: {
        userId, // update userId just in case the endpoint is reused by another user
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: dto.userAgent ?? null,
        platform: dto.platform ?? null,
        lastSeenAt: new Date(),
      },
    });
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
  }
}
