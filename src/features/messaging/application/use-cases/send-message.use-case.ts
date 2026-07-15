import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MediaUrlService } from '../../../media/application/services/media-url.service.js';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { SendMessageInput, MessageView } from '../../domain/types/messaging.types.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { ResourcePreviewService } from '../services/resource-preview.service.js';
import { EmbedResolverService } from '../services/embed-resolver.service.js';

@Injectable()
export class SendMessageUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
    private readonly resourcePreviewService: ResourcePreviewService,
    private readonly embedResolver: EmbedResolverService,
  ) {}

  async execute(input: SendMessageInput): Promise<MessageView> {
    if (!input.content && !input.mediaUrl && (!input.embeds || input.embeds.length === 0)) {
      throw new BadRequestException('Message must contain content, media, or an embed');
    }

    const allowed = await this.repo.isParticipant(input.conversationId, input.participantId);
    if (!allowed) {
      throw new ForbiddenException('You are not a participant of this conversation.');
    }

    // Resolve participant for snapshots
    const participant = await this.prisma.participant.findUnique({
      where: { id: input.participantId },
      include: { user: true, business: true },
    });

    if (!participant) {
      throw new BadRequestException('Participant not found');
    }

    let senderDisplayName = 'Unknown';
    let senderAvatarUrl: string | null = null;

    if (participant.business) {
      senderDisplayName = participant.business.name;
      const media = await this.prisma.media.findFirst({
        where: { businessProfileId: participant.business.id, role: 'LOGO' },
        orderBy: { createdAt: 'desc' },
      });
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
      senderDisplayName = participant.user.username;
      senderAvatarUrl = participant.user.avatarUrl;
    }

    // Extract resource previews
    const autoEmbeds = await this.resourcePreviewService.extractPreviews(input.content);
    let resolvedEmbeds: any[] = [];
    
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

    input.embeds = resolvedEmbeds as any;

    const message = await this.repo.addMessage(input, senderDisplayName, senderAvatarUrl);

    // Event bus tracking (legacy for analytics)
    await this.eventBus.publish('message.sent', {
      senderId: message.participantId,
      conversationId: message.conversationId,
    });

    return message;
  }
}
