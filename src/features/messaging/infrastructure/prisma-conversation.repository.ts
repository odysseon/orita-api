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
  ConversationType,
} from '../domain/types/messaging.types.js';
import type { ConversationAnchor } from '../../../../generated/prisma/client.js';

@Injectable()
export class PrismaConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapMessage(m: any): MessageView {
    return {
      id: m.id,
      conversationId: m.conversationId,
      participantId: m.participantId,
      senderDisplayName: m.senderDisplayName,
      senderAvatarUrl: m.senderAvatarUrl,
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      embeds: (m.embeds || []).map((e: any): MessageEmbedView => ({
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
      readReceipts: (m.readReceipts || []).map((r: any): MessageReadReceiptView => ({
        messageId: r.messageId,
        participantId: r.participantId,
        readAt: r.readAt,
      })),
    };
  }

  private mapConversation(c: any): ConversationView {
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
      type: c.type as ConversationType,
      status: c.status as ConversationStatus,
      title: c.title,
      anchorId: c.anchorId,
      anchor: anchorView,
      participantIds: c.participants.map((p: any) => p.participantId),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async create(input: CreateConversationInput, anchor?: ConversationAnchor): Promise<ConversationView> {
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
    const embedsData = input.embeds?.map((e) => ({
      embedType: e.embedType,
      targetId: e.targetId,
      title: 'Embed Snapshot', // In a full implementation, AnchorService logic would resolve these per-embed
      subtitle: null,
      imageUrl: null,
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
    await this.prisma.$transaction(
      input.messageIds.map((messageId) =>
        this.prisma.messageReadReceipt.upsert({
          where: { messageId_participantId: { messageId, participantId: input.participantId } },
          create: { messageId, participantId: input.participantId },
          update: {},
        }),
      ),
    );
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
