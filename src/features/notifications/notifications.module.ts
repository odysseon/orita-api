import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationEngine } from './application/engine/notification.engine.js';
import { PreferenceFilterService } from './application/services/preference-filter.service.js';
import { ChannelRouterService } from './application/services/channel-router.service.js';
import { TemplateRendererService } from './application/services/template-renderer.service.js';
import { NearbyAudienceResolver } from './application/resolvers/nearby-audience.resolver.js';
import { ListingPublishedPolicy } from './application/policies/listing-published.policy.js';
import { BusinessPublishedPolicy } from './application/policies/business-published.policy.js';
import { BusinessPublishedOwnerPolicy } from './application/policies/business-published-owner.policy.js';
import { MessageReceivedPolicy } from './application/policies/message-received.policy.js';
import { EmailWorker } from './infrastructure/workers/email.worker.js';
import { PushWorker } from './infrastructure/workers/push.worker.js';
import { InAppWorker } from './infrastructure/workers/in-app.worker.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { IdentityModule } from '../../shared/identity/identity.module.js';

import { NotificationsController } from './api/controllers/notifications.controller.js';
import { NotificationsGateway } from './api/gateways/notifications.gateway.js';
import { NotificationsService } from './application/services/notifications.service.js';
import { NotificationPresenter } from './application/presenters/notification.presenter.js';
import { PushSubscriptionsController } from './api/controllers/push-subscriptions.controller.js';
import { PushSubscriptionService } from './application/services/push-subscriptions.service.js';
import { PushNotificationSender } from './infrastructure/senders/push-notification.sender.js';
import { AuthModule } from '../../auth/auth.module.js';

@Module({
  imports: [
    PrismaModule,
    IdentityModule,
    AuthModule,
    BullModule.registerQueue(
      { name: 'email_delivery_queue' },
      { name: 'push_delivery_queue' },
      { name: 'in_app_delivery_queue' },
    ),
  ],
  controllers: [NotificationsController, PushSubscriptionsController],
  providers: [
    // Engine & Services
    NotificationEngine,
    NotificationsService,
    PushSubscriptionService,
    PreferenceFilterService,
    ChannelRouterService,
    TemplateRendererService,

    // Gateways & Presenters
    NotificationsGateway,
    NotificationPresenter,
    PushNotificationSender,

    // Resolvers
    NearbyAudienceResolver,

    // Policies
    ListingPublishedPolicy,
    BusinessPublishedPolicy,
    BusinessPublishedOwnerPolicy,
    MessageReceivedPolicy,

    // Workers
    EmailWorker,
    PushWorker,
    InAppWorker,
  ],
  exports: [NotificationEngine],
})
export class NotificationsModule {}
