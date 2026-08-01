import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../shared/redis/redis.module.js';
import { IConversationRepository } from './domain/ports/conversation.repository.port.js';
import { IRealtimeGateway } from './domain/ports/realtime.gateway.port.js';
import { PrismaConversationRepository } from './infrastructure/prisma-conversation.repository.js';
import { CreateConversationUseCase } from './application/use-cases/create-conversation.use-case.js';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case.js';
import { GetConversationsUseCase } from './application/use-cases/get-conversations.use-case.js';
import { GetConversationDetailsUseCase } from './application/use-cases/get-conversation-details.use-case.js';
import { UpdateConversationStatusUseCase } from './application/use-cases/update-conversation-status.use-case.js';
import { MarkMessagesReadUseCase } from './application/use-cases/mark-messages-read.use-case.js';
import { OpenConversationUseCase } from './application/use-cases/open-conversation.use-case.js';
import { ParticipantService } from './application/services/participant.service.js';
import { ConversationParticipantResolver } from './application/services/conversation-participant-resolver.service.js';
import { ConversationAccessPolicy } from './application/policies/conversation-access.policy.js';
import { AnchorService } from './application/services/anchor.service.js';
import { ResourcePreviewService } from './application/services/resource-preview.service.js';
import { EmbedResolverService } from './application/services/embed-resolver.service.js';
import { BusinessEmbedBuilder } from './application/services/embed-builders/business.embed-builder.js';
import { ListingEmbedBuilder } from './application/services/embed-builders/listing.embed-builder.js';
import { TourEmbedBuilder } from './application/services/embed-builders/tour.embed-builder.js';
import { LocationEmbedBuilder } from './application/services/embed-builders/location.embed-builder.js';
import { OpportunityEmbedBuilder } from './application/services/embed-builders/opportunity.embed-builder.js';
import { WsAuthGuard } from './api/gateways/ws-auth.guard.js';
import { MessagingGateway } from './api/gateways/messaging.gateway.js';
import { ConversationsController } from './api/controllers/conversations.controller.js';
import { MessagePreviewFactory } from './infrastructure/message-preview.factory.js';
import { NotificationPreviewFactory } from './infrastructure/notification-preview.factory.js';

import { AuthModule } from '../../auth/auth.module.js';

@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => AuthModule), forwardRef(() => MediaModule)],
  controllers: [ConversationsController],
  providers: [
    // Repository binding
    {
      provide: IConversationRepository,
      useClass: PrismaConversationRepository,
    },
    // Gateway implements IRealtimeGateway — bind the class to the abstract token
    MessagingGateway,
    {
      provide: IRealtimeGateway,
      useExisting: MessagingGateway,
    },
    // Auth guard for WebSocket
    WsAuthGuard,
    // Services
    ParticipantService,
    ConversationParticipantResolver,
    ConversationAccessPolicy,
    AnchorService,
    ResourcePreviewService,
    EmbedResolverService,
    BusinessEmbedBuilder,
    ListingEmbedBuilder,
    TourEmbedBuilder,
    LocationEmbedBuilder,
    OpportunityEmbedBuilder,
    // Use cases
    CreateConversationUseCase,
    SendMessageUseCase,
    GetConversationsUseCase,
    GetConversationDetailsUseCase,
    UpdateConversationStatusUseCase,
    MarkMessagesReadUseCase,
    OpenConversationUseCase,
    MessagePreviewFactory,
    NotificationPreviewFactory,
  ],
  exports: [
    IConversationRepository,
    ParticipantService,
    ConversationAccessPolicy,
    OpenConversationUseCase,
    SendMessageUseCase,
  ],
})
export class MessagingModule {}
