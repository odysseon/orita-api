import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { ParticipantService } from './participant.service.js';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationRepo: IConversationRepository,
    private readonly participantService: ParticipantService,
  ) {}

  /**
   * Ensures a conversation exists for an order.
   * If the order already has a conversation, returns it.
   * Otherwise, creates a new conversation, links it to the order's subject, and associates it with the order.
   */
  async ensureConversationForOrder(orderId: string, initiatorId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.conversationId) {
      return this.conversationRepo.findById(order.conversationId);
    }

    let anchorType = 'LISTING';
    let targetId = order.listingId;
    if (order.opportunityId) {
      anchorType = 'OPPORTUNITY';
      targetId = order.opportunityId;
    }

    if (!targetId) {
      throw new Error('Order has no valid subject to anchor conversation to');
    }

    const initiatorIsBuyer = order.buyerId === initiatorId;
    let initiatorParticipant;
    if (initiatorIsBuyer) {
      initiatorParticipant = order.buyerBusinessId
        ? await this.participantService.ensureBusinessParticipant(order.buyerBusinessId)
        : await this.participantService.ensurePersonalParticipant(order.buyerId);
    } else {
      // Seller
      const sellerUserId = order.sellerUserId || initiatorId;
      initiatorParticipant = order.sellerBusinessId
        ? await this.participantService.ensureBusinessParticipant(order.sellerBusinessId)
        : await this.participantService.ensurePersonalParticipant(sellerUserId);
    }

    let otherParticipant;
    if (initiatorIsBuyer) {
      // Seller is the other
      const sellerUserId = order.sellerUserId || initiatorId; // fallback shouldn't happen if properly created
      otherParticipant = order.sellerBusinessId
        ? await this.participantService.ensureBusinessParticipant(order.sellerBusinessId)
        : await this.participantService.ensurePersonalParticipant(sellerUserId);
    } else {
      // Buyer is the other
      otherParticipant = order.buyerBusinessId
        ? await this.participantService.ensureBusinessParticipant(order.buyerBusinessId)
        : await this.participantService.ensurePersonalParticipant(order.buyerId);
    }

    const conversation = await this.conversationRepo.create({
      type: 'DIRECT',
      participantId: initiatorParticipant.id,
      invitedParticipantIds: [otherParticipant.id],
      anchor: {
        type: anchorType,
        targetId,
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { conversationId: conversation.id },
    });

    return conversation;
  }
}
