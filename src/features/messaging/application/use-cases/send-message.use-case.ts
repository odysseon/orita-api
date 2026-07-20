import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { MediaUrlService } from '../../../media/application/services/media-url.service.js';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { SendMessageInput, MessageView } from '../../domain/types/messaging.types.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { ResourcePreviewService } from '../services/resource-preview.service.js';
import { EmbedResolverService } from '../services/embed-resolver.service.js';
import { ConversationParticipantResolver } from '../services/conversation-participant-resolver.service.js';
import { MessagePreviewFactory } from '../../infrastructure/message-preview.factory.js';
import { NotificationPreviewFactory } from '../../infrastructure/notification-preview.factory.js';

@Injectable()
export class SendMessageUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
    private readonly resourcePreviewService: ResourcePreviewService,
    private readonly embedResolver: EmbedResolverService,
    private readonly resolver: ConversationParticipantResolver,
    private readonly previewFactory: MessagePreviewFactory,
    private readonly notificationPreviewFactory: NotificationPreviewFactory,
  ) {}

  async execute(
    input: Omit<SendMessageInput, 'participantId'>,
    requesterParticipantIds: string[],
  ): Promise<MessageView> {
    if (!input.content && !input.mediaUrl && (!input.embeds || input.embeds.length === 0)) {
      throw new BadRequestException('Message must contain content, media, or an embed');
    }

    const conversation = await this.repo.findById(input.conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${input.conversationId} not found.`);
    }

    const participantId = this.resolver.resolve(conversation, requesterParticipantIds);

    // Resolve participant for snapshots
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        user: { include: { media: { where: { role: 'AVATAR' } } } },
        business: { include: { media: { where: { role: 'LOGO' } } } },
      },
    });

    if (!participant) {
      throw new BadRequestException('Participant not found');
    }

    let senderDisplayName = 'Unknown';
    let senderAvatarUrl: string | null = null;

    if (participant.business) {
      senderDisplayName = participant.business.name;
      const media = participant.business.media?.[0];
      senderAvatarUrl = media
        ? this.mediaUrlService.getMediaUrl(
            media.provider,
            media.fileId,
            media.mimeType,
            media.version,
            media.format,
          )
        : null;
    } else if (participant.user) {
      senderDisplayName = participant.user.displayName || participant.user.username;
      const media = participant.user.media?.[0];
      senderAvatarUrl = media
        ? this.mediaUrlService.getMediaUrl(
            media.provider,
            media.fileId,
            media.mimeType,
            media.version,
            media.format,
          )
        : null;
    }

    // Extract resource previews
    const autoEmbeds = await this.resourcePreviewService.extractPreviews(input.content);
    const resolvedEmbeds: unknown[] = [];

    // Resolve frontend-provided embeds and auto-embeds into full snapshots
    const rawEmbeds = [...(input.embeds || []), ...autoEmbeds];
    for (const ref of rawEmbeds) {
      const snapshot = await this.embedResolver.resolve(ref.embedType, ref.targetId);
      resolvedEmbeds.push({
        embedType: ref.embedType,
        targetId: ref.targetId,
        ...snapshot,
      });
    }

    const fullInput: SendMessageInput = {
      ...input,
      participantId,
      embeds: resolvedEmbeds as NonNullable<SendMessageInput['embeds']>,
    };

    const message = await this.repo.addMessage(fullInput, senderDisplayName, senderAvatarUrl);

    // Figure out the recipients (all other participants in this conversation)
    const otherParticipants = await this.prisma.participant.findMany({
      where: {
        id: { in: conversation.participantIds.filter((id) => id !== participantId) },
      },
      include: { business: true },
    });
    const recipientUserIds = otherParticipants
      .map((p) => p.userId || p.business?.ownerId)
      .filter(Boolean) as string[];

    const previewView = this.previewFactory.create({
      id: message.id,
      content: message.content,
      participantId: message.participantId,
      senderDisplayName: message.senderDisplayName,
      createdAt: message.createdAt,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      embeds: message.embeds,
    });

    // Event bus tracking & Notifications
    await this.eventBus.publish('message.sent', {
      messageId: message.id,
      conversationId: message.conversationId,
      senderUserId: participant.userId || participant.business?.ownerId || null,
      senderDisplayName: message.senderDisplayName,
      recipientUserIds,
      preview: previewView.descriptor,
      notificationPreview: this.notificationPreviewFactory.build(previewView.descriptor),
      sentAt: message.createdAt,
    });

    return message;
  }
}
