import { Injectable } from '@nestjs/common';
import { OpenConversationUseCase } from '../../../messaging/application/use-cases/open-conversation.use-case.js';
import { SendMessageUseCase } from '../../../messaging/application/use-cases/send-message.use-case.js';
import { ParticipantService } from '../../../messaging/application/services/participant.service.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import { InternalShareInput, ShareResult } from '../../domain/types/sharing.types.js';
import { TransactionManager } from '../../../../prisma/transaction-manager.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class ShareService {
  constructor(
    private readonly openConversation: OpenConversationUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly participantService: ParticipantService,
    private readonly eventBus: EventBusService,
    private readonly transactionManager: TransactionManager,
    private readonly prisma: PrismaService,
  ) {}

  async share(input: InternalShareInput): Promise<ShareResult[]> {
    return this.transactionManager.execute(this.prisma, async () => {
      const results: ShareResult[] = [];
      const participants = await this.participantService.getMyParticipants(input.senderId);
      const myParticipantIds = participants.map((p) => p.id);

      for (const recipientId of input.recipientIds) {
        // 1. Find or create a direct conversation
        const conversation = await this.openConversation.execute({
          userId: input.senderId,
          targetType: 'USER',
          targetId: recipientId,
        });

        // 2. Send the message with the embed
        const message = await this.sendMessage.execute(
          {
            conversationId: conversation.id,
            ...(input.content ? { content: input.content } : {}),
            embeds: [
              {
                embedType: input.embedType,
                targetId: input.targetId,
              },
            ],
          },
          myParticipantIds,
        );

        // 3. Emit the internal content.shared event
        await this.eventBus.publish('content.shared', {
          senderId: input.senderId,
          recipientId,
          embedType: input.embedType,
          targetId: input.targetId,
        });

        results.push({
          recipientId,
          conversationId: conversation.id,
          messageId: message.id,
        });
      }

      return results;
    });
  }
}
