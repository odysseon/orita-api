import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { IConversationRepository } from '../domain/ports/conversation.repository.port.js';
import {
  ConversationView,
  MessageView,
  MessageReadReceiptView,
  CreateConversationInput,
  SendMessageInput,
  MarkMessagesReadInput,
  ConversationStatus,
  MessageEmbedView,
  ConversationAnchorView,
} from '../domain/types/messaging.types.js';
import type {
  ConversationAnchor,
  Message,
  MessageEmbed,
  MessageReadReceipt,
  Conversation,
  ConversationParticipant,
} from '../../../../generated/prisma/client.js';

import { MessagePreviewFactory } from './message-preview.factory.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';

type HydratedMessage = Message & { embeds?: MessageEmbed[]; readReceipts?: MessageReadReceipt[] };
type HydratedConversation = Conversation & {
  anchor?: ConversationAnchor | null;
  participants: ConversationParticipant[];
};

@Injectable()
export class PrismaConversationRepository implements IConversationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messagePreviewFactory: MessagePreviewFactory,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

  private mapMessage(m: HydratedMessage): MessageView {
    return {
      id: m.id,
      conversationId: m.conversationId,
      participantId: m.participantId,
      senderDisplayName: m.senderDisplayName,
      senderAvatarUrl: m.senderAvatarUrl,
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      embeds: (m.embeds || []).map((e: MessageEmbed): MessageEmbedView => ({
        id: e.id,
        embedType: e.embedType,
        targetId: e.targetId,
        title: e.title,
        subtitle: e.subtitle,
        imageUrl: e.imageUrl,
        ctaLabel: e.ctaLabel,
        ctaPath: e.ctaPath,
      })),
      createdAt: m.createdAt,
      readReceipts: (m.readReceipts || []).map((r: MessageReadReceipt): MessageReadReceiptView => ({
        messageId: r.messageId,
        participantId: r.participantId,
        readAt: r.readAt,
      })),
    };
  }

  private mapConversation(c: HydratedConversation): ConversationView {
    let anchorView: ConversationAnchorView | null = null;
    if (c.anchor) {
      anchorView = {
        id: c.anchor.id,
        title: c.anchor.title,
        subtitle: c.anchor.subtitle,
        imageUrl: c.anchor.imageUrl,
        businessId: c.anchor.businessId,
        listingId: c.anchor.listingId,
        tourId: c.anchor.tourId,
        locationId: c.anchor.locationId,
      };
    }

    return {
      id: c.id,
      type: c.type,
      status: c.status,
      title: c.title,
      anchorId: c.anchorId,
      anchor: anchorView,
      participantIds: c.participants.map((p: ConversationParticipant) => p.participantId),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async create(
    input: CreateConversationInput,
    anchor?: ConversationAnchor,
  ): Promise<ConversationView> {
    const participantIds = [input.participantId, ...input.invitedParticipantIds];
    const uniqueParticipants = Array.from(new Set(participantIds));

    const conversation = await this.prisma.conversation.create({
      data: {
        type: input.type,
        anchorId: anchor?.id ?? null,
        participants: {
          create: uniqueParticipants.map((pid) => ({
            participantId: pid,
            role: pid === input.participantId ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: { participants: true, anchor: true },
    });

    return this.mapConversation(conversation);
  }

  async addMessage(
    input: SendMessageInput,
    senderDisplayName: string,
    senderAvatarUrl: string | null,
  ): Promise<MessageView> {
    const embedsData =
      (
        input.embeds as Array<{
          embedType: import('../../../../generated/prisma/client.js').MessageEmbedType;
          targetId: string;
          title?: string;
          subtitle?: string;
          imageUrl?: string;
          ctaLabel?: string;
          ctaPath?: string;
        }>
      )?.map((e) => ({
        embedType: e.embedType,
        targetId: e.targetId,
        title: e.title || 'Embed Snapshot',
        subtitle: e.subtitle || null,
        imageUrl: e.imageUrl || null,
        ctaLabel: e.ctaLabel || null,
        ctaPath: e.ctaPath || null,
      })) || [];

    const message = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        participantId: input.participantId,
        senderDisplayName,
        senderAvatarUrl,
        content: input.content ?? null,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaType ?? null,
        embeds: {
          create: embedsData,
        },
      },
      include: { readReceipts: true, embeds: true },
    });

    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    });

    return this.mapMessage(message);
  }

  async findById(id: string): Promise<ConversationView | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: { participants: true, anchor: true },
    });
    if (!conversation) return null;
    return this.mapConversation(conversation);
  }

  async findByParticipantIds(participantIds: string[]): Promise<ConversationView[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { participantId: { in: participantIds } } } },
      include: { participants: true, anchor: true },
      orderBy: { updatedAt: 'desc' },
    });
    return conversations.map((c) => this.mapConversation(c));
  }

  async findPreviewsByParticipantIds(
    myParticipantIds: string[],
  ): Promise<import('../domain/types/messaging.types.js').ConversationPreviewView[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { participantId: { in: myParticipantIds } } } },
      select: {
        id: true,
        type: true,
        title: true,
        updatedAt: true,
        participants: {
          select: {
            participantId: true,
            role: true,
            participant: {
              select: {
                user: { include: { media: { where: { role: 'AVATAR' } } } },
                business: { include: { media: { where: { role: 'LOGO' } } } },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            participantId: true,
            senderDisplayName: true,
            createdAt: true,
            mediaUrl: true,
            mediaType: true,
            embeds: { take: 1, select: { embedType: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (conversations.length === 0) return [];

    // Optimize unread counts with a single query to avoid N+1
    const unreadCountsRaw = await this.prisma.$queryRaw<
      { conversationId: string; unreadCount: bigint }[]
    >`
      SELECT m."conversationId", COUNT(*) as "unreadCount"
      FROM "messages" m
      INNER JOIN "conversation_participants" cp ON m."conversationId" = cp."conversationId"
      WHERE cp."participantId" IN (${Prisma.join(myParticipantIds)})
        AND m."createdAt" > cp."lastReadAt"
      GROUP BY m."conversationId"
    `;

    const unreadCountMap = new Map<string, number>();
    for (const row of unreadCountsRaw) {
      unreadCountMap.set(row.conversationId, Number(row.unreadCount));
    }

    return conversations.map((c) => {
      let title = c.title || 'Conversation';
      let avatarUrl: string | null = null;

      // Context-aware title for DIRECT conversations
      if (c.type === 'DIRECT') {
        // Find a participant the user doesn't own
        let other = c.participants.find((p) => !myParticipantIds.includes(p.participantId));

        // If the user owns BOTH sides (e.g. messaging their own business),
        // fall back to the participant that didn't initiate the conversation
        if (!other && c.participants.length > 1) {
          other = c.participants.find((p) => p.role !== 'OWNER') || c.participants[1];
        }

        if (other?.participant) {
          if (other.participant.user) {
            title = other.participant.user.displayName || other.participant.user.username;
            const media = other.participant.user.media?.[0];
            avatarUrl = media
              ? this.mediaUrlService.getMediaUrl(
                  media.provider,
                  media.fileId,
                  media.mimeType,
                  media.version,
                  media.format,
                )
              : null;
          } else if (other.participant.business) {
            title = other.participant.business.name;
            const media = other.participant.business.media?.[0];
            avatarUrl = media
              ? this.mediaUrlService.getMediaUrl(
                  media.provider,
                  media.fileId,
                  media.mimeType,
                  media.version,
                  media.format,
                )
              : null;
          }
        }
      }

      let latestMessagePreview:
        import('../domain/types/messaging.types.js').MessagePreviewView | undefined;
      const unreadCount = unreadCountMap.get(c.id) || 0;

      if (c.messages.length > 0) {
        latestMessagePreview = this.messagePreviewFactory.create(c.messages[0]!);
      }

      const preview: import('../domain/types/messaging.types.js').ConversationPreviewView = {
        id: c.id,
        type: c.type,
        title,
        avatarUrl,
        unreadCount,
        lastActivityAt: c.updatedAt,
      };

      if (latestMessagePreview) {
        preview.latestMessage = latestMessagePreview;
      }

      return preview;
    });
  }

  async getMessages(conversationId: string): Promise<MessageView[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: { readReceipts: true, embeds: true },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => this.mapMessage(m));
  }

  async updateStatus(id: string, status: ConversationStatus): Promise<ConversationView> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { status },
      include: { participants: true, anchor: true },
    });
    return this.mapConversation(conversation);
  }

  async markRead(input: MarkMessagesReadInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Create explicit read receipts for the specified messages
      await Promise.all(
        input.messageIds.map((messageId) =>
          tx.messageReadReceipt.upsert({
            where: { messageId_participantId: { messageId, participantId: input.participantId } },
            create: { messageId, participantId: input.participantId },
            update: {},
          }),
        ),
      );

      // Fetch the max createdAt of the read messages
      const messages = await tx.message.findMany({
        where: { id: { in: input.messageIds } },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      if (messages.length > 0) {
        const latestReadAt = messages[0]!.createdAt;

        // Update lastReadAt on the conversation participant if it is newer
        const currentParticipant = await tx.conversationParticipant.findUnique({
          where: {
            conversationId_participantId: {
              conversationId: input.conversationId,
              participantId: input.participantId,
            },
          },
        });

        if (currentParticipant && latestReadAt > currentParticipant.lastReadAt) {
          await tx.conversationParticipant.update({
            where: {
              conversationId_participantId: {
                conversationId: input.conversationId,
                participantId: input.participantId,
              },
            },
            data: { lastReadAt: latestReadAt },
          });
        }
      }
    });
  }

  async isParticipant(conversationId: string, participantId: string): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_participantId: { conversationId, participantId } },
    });
    return participant !== null;
  }

  async addParticipants(conversationId: string, participantIds: string[]): Promise<void> {
    await this.prisma.conversationParticipant.createMany({
      data: participantIds.map((pid) => ({
        conversationId,
        participantId: pid,
        role: 'MEMBER',
      })),
      skipDuplicates: true,
    });
  }
}
