import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateConfig } from './configs/validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { IdentityModule } from './shared/identity/identity.module.js';
import { StorageModule } from './storage/storage.module.js';
import { UsersModule } from './users/users.module.js';
import { BusinessProfileModule } from './features/business-profile/business-profile.module.js';
import { TagModule } from './features/tag/tag.module.js';

import { ListingModule } from './features/listing/listing.module.js';
import { MediaModule } from './features/media/media.module.js';
import { CategoryModule } from './features/category/category.module.js';
import { ReviewModule } from './features/review/review.module.js';
import { BusinessTourModule } from './features/business-tour/business-tour.module.js';
import { MessagingModule } from './features/messaging/messaging.module.js';
import { SavesModule } from './features/saves/saves.module.js';
import { AnalyticsModule } from './features/analytics/analytics.module.js';
import { AdminModule } from './features/admin/admin.module.js';
import { FeedModule } from './features/feed/feed.module.js';
import { LocationsModule } from './features/locations/locations.module.js';
import { FollowsModule } from './features/follows/follows.module.js';
import { MailModule } from './mail/mail.module.js';
import { RedisModule } from './shared/redis/redis.module.js';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventsModule } from './shared/events/domain-events.module.js';
import { SearchModule } from './features/search/search.module.js';
import { NotificationsModule } from './features/notifications/notifications.module.js';
import { SeoModule } from './features/seo/seo.module.js';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    DomainEventsModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      global: true,
      wildcard: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validate: validateConfig,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        const password = configService.get<string>('REDIS_PASSWORD');
        return {
          connection: {
            ...(host ? { host } : {}),
            ...(port ? { port } : {}),
            ...(password ? { password } : {}),
          },
        };
      },
    }),
    PrismaModule,
    RedisModule,
    IdentityModule,
    AuthModule,
    StorageModule,
    UsersModule,
    CategoryModule,
    TagModule,
    BusinessProfileModule,
    ListingModule,
    MediaModule,

    ReviewModule,
    BusinessTourModule,
    MessagingModule,
    SavesModule,
    AnalyticsModule,
    AdminModule,
    FeedModule,
    LocationsModule,
    FollowsModule,
    MailModule,
    RedisModule,
    SearchModule,
    NotificationsModule,
    SeoModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
