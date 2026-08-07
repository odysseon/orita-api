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
import { FinalizeMessageAttachmentsUseCase } from '../../../media/application/use-cases/finalize-message-attachments.use-case.js';
import { TransactionManager } from '../../../../prisma/transaction-manager.service.js';

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
    private readonly finalizeMedia: FinalizeMessageAttachmentsUseCase,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(
    input: Omit<SendMessageInput, 'participantId'>,
    requesterParticipantIds: string[],
  ): Promise<MessageView> {
    if (
      !input.content &&
      !input.mediaUrl &&
      (!input.embeds || input.embeds.length === 0) &&
      (!input.attachmentIds || input.attachmentIds.length === 0)
    ) {
      throw new BadRequestException('Message must contain content, media, embeds, or attachments');
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

    return this.transactionManager.execute(this.prisma, async () => {
      const message = await this.repo.addMessage(fullInput, senderDisplayName, senderAvatarUrl);

      if (input.attachmentIds && input.attachmentIds.length > 0) {
        await this.finalizeMedia.execute(input.attachmentIds, message.id);

        const media = await this.prisma.media.findMany({
          where: { id: { in: input.attachmentIds } },
          select: {
            id: true,
            fileId: true,
            provider: true,
            role: true,
            mimeType: true,
            version: true,
            format: true,
            mediaType: true,
            bytes: true,
          },
        });
        message.attachments = media.map((a) => ({
          id: a.id,
          url: this.mediaUrlService.getMediaUrl(
            a.provider,
            a.fileId,
            a.mimeType,
            a.version,
            a.format,
          ),
          mediaType: a.mediaType,
          mimeType: a.mimeType,
          bytes: a.bytes,
        }));
      }

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
        attachments: message.attachments,
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
    });
  }
}
