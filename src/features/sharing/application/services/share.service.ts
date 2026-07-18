import { Injectable } from '@nestjs/common';
import { OpenConversationUseCase } from '../../../messaging/application/use-cases/open-conversation.use-case.js';
import { SendMessageUseCase } from '../../../messaging/application/use-cases/send-message.use-case.js';
import { ParticipantService } from '../../../messaging/application/services/participant.service.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import { InternalShareInput, ShareResult } from '../../domain/types/sharing.types.js';

@Injectable()
export class ShareService {
  constructor(
    private readonly openConversation: OpenConversationUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly participantService: ParticipantService,
    private readonly eventBus: EventBusService,
  ) {}

  async share(input: InternalShareInput): Promise<ShareResult[]> {
    const results: ShareResult[] = [];
    const senderParticipant = await this.participantService.ensurePersonalParticipant(
      input.senderId,
    );

    for (const recipientId of input.recipientIds) {
      // 1. Find or create a direct conversation
      const conversation = await this.openConversation.execute({
        userId: input.senderId,
        targetType: 'USER',
        targetId: recipientId,
      });

      // 2. Send the message with the embed
      const message = await this.sendMessage.execute({
        conversationId: conversation.id,
        participantId: senderParticipant.id,
        ...(input.content ? { content: input.content } : {}),
        embeds: [
          {
            embedType: input.embedType,
            targetId: input.targetId,
          },
        ],
      });

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
  }
}
