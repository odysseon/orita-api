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
  MessageReferencePreview,
} from '../domain/types/messaging.types.js';

@Injectable()
export class PrismaConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapMessage(m: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    mediaUrl: string | null;
    mediaType: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    createdAt: Date;
    readReceipts: { messageId: string; userId: string; readAt: Date }[];
  }): MessageView {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType as MessageView['mediaType'],
      referenceType: m.referenceType as MessageView['referenceType'] | null,
      referenceId: m.referenceId ?? null,
      createdAt: m.createdAt,
      readReceipts: m.readReceipts.map((r): MessageReadReceiptView => ({
        messageId: r.messageId,
        userId: r.userId,
        readAt: r.readAt,
      })),
    };
  }

  private mapConversation(c: {
    id: string;
    businessProfileId: string;
    listingId: string | null;
    subject: string | null;
    status: string;
    participants: { userId: string }[];
    createdAt: Date;
    updatedAt: Date;
  }): ConversationView {
    return {
      id: c.id,
      businessProfileId: c.businessProfileId,
      listingId: c.listingId,
      subject: c.subject,
      status: c.status as ConversationStatus,
      participantIds: c.participants.map((p) => p.userId),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async create(input: CreateConversationInput): Promise<ConversationView> {
    const conversation = await this.prisma.conversation.create({
      data: {
        businessProfileId: input.businessProfileId,
        listingId: input.listingId ?? null,
        subject: input.subject ?? null,
        participants: {
          create: { userId: input.userId },
        },
        messages: {
          create: {
            senderId: input.userId,
            content: input.initialMessage,
          },
        },
      },
      include: { participants: true },
    });

    return this.mapConversation(conversation);
  }

  async addMessage(input: SendMessageInput): Promise<MessageView> {
    const message = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        content: input.content,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaType ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
      },
      include: { readReceipts: true },
    });

    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    });

    const mapped = this.mapMessage(message);
    if (mapped.referenceType && mapped.referenceId) {
      const previewMap = await this.fetchReferencePreviews([
        { type: mapped.referenceType, id: mapped.referenceId },
      ]);
      const preview = previewMap.get(mapped.referenceId);
      if (preview) {
        mapped.referencePreview = preview;
      }
    }
    return mapped;
  }

  async findById(id: string): Promise<ConversationView | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!conversation) return null;
    return this.mapConversation(conversation);
  }

  async findByBusinessProfile(businessProfileId: string): Promise<ConversationView[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { businessProfileId },
      include: { participants: true },
      orderBy: { updatedAt: 'desc' },
    });
    return conversations.map((c) => this.mapConversation(c));
  }

  async findByParticipant(userId: string): Promise<ConversationView[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: { participants: true },
      orderBy: { updatedAt: 'desc' },
    });
    return conversations.map((c) => this.mapConversation(c));
  }

  private async fetchReferencePreviews(
    refs: { type: string; id: string }[],
  ): Promise<Map<string, MessageReferencePreview>> {
    const map = new Map<string, MessageReferencePreview>();
    const businessIds = refs.filter((r) => r.type === 'BUSINESS').map((r) => r.id);
    const listingIds = refs.filter((r) => r.type === 'LISTING').map((r) => r.id);
    const tourIds = refs.filter((r) => r.type === 'TOUR').map((r) => r.id);

    if (businessIds.length) {
      const b = await this.prisma.businessProfile.findMany({
        where: { id: { in: businessIds } },
        include: { media: { take: 1, orderBy: { createdAt: 'asc' } } },
      });
      b.forEach((item) =>
        map.set(item.id, {
          title: item.name,
          subtitle: item.description,
          ...(item.media[0]?.url && { coverUrl: item.media[0]?.url }),
        }),
      );
    }
    if (listingIds.length) {
      const l = await this.prisma.listing.findMany({
        where: { id: { in: listingIds } },
        include: { businessProfile: true, media: { take: 1, orderBy: { createdAt: 'asc' } } },
      });
      l.forEach((item) =>
        map.set(item.id, {
          title: item.title,
          subtitle: item.businessProfile?.name,
          ...(item.media[0]?.url && { coverUrl: item.media[0]?.url }),
        }),
      );
    }
    if (tourIds.length) {
      const t = await this.prisma.businessTour.findMany({
        where: { id: { in: tourIds } },
        include: { businessProfile: true, media: { take: 1, orderBy: { createdAt: 'asc' } } },
      });
      t.forEach((item) =>
        map.set(item.id, {
          title: item.title,
          subtitle: item.businessProfile?.name,
          ...(item.media[0]?.url && { coverUrl: item.media[0]?.url }),
        }),
      );
    }
    return map;
  }

  async getMessages(conversationId: string): Promise<MessageView[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: { readReceipts: true },
      orderBy: { createdAt: 'asc' },
    });

    const refs = messages
      .filter((m) => m.referenceType && m.referenceId)
      .map((m) => ({ type: m.referenceType as string, id: m.referenceId as string }));

    const previewMap = refs.length
      ? await this.fetchReferencePreviews(refs)
      : new Map<string, MessageReferencePreview>();

    return messages.map((m) => {
      const mapped = this.mapMessage(m);
      if (mapped.referenceId) {
        const preview = previewMap.get(mapped.referenceId);
        if (preview) {
          mapped.referencePreview = preview;
        }
      }
      return mapped;
    });
  }

  async updateStatus(id: string, status: ConversationStatus): Promise<ConversationView> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { status },
      include: { participants: true },
    });
    return this.mapConversation(conversation);
  }

  async markRead(input: MarkMessagesReadInput): Promise<void> {
    await this.prisma.$transaction(
      input.messageIds.map((messageId) =>
        this.prisma.messageReadReceipt.upsert({
          where: { messageId_userId: { messageId, userId: input.userId } },
          create: { messageId, userId: input.userId },
          update: {},
        }),
      ),
    );
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    return participant !== null;
  }
}
