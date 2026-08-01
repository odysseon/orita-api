import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { ParticipantService } from '../services/participant.service.js';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { EventBusService } from '../../../../shared/events/event-bus.service.js';

export interface OpenConversationInput {
  userId: string;
  targetType: 'USER' | 'BUSINESS' | 'OPPORTUNITY';
  targetId: string;
}

@Injectable()
export class OpenConversationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly participantService: ParticipantService,
    private readonly repo: IConversationRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: OpenConversationInput) {
    let targetId = input.targetId;
    let anchorInput: { type: string; targetId: string } | undefined;
    let targetParticipantType: 'USER' | 'BUSINESS' = 'USER';

    if (input.targetType === 'BUSINESS') {
      const biz = await this.prisma.businessProfile.findFirst({
        where: {
          OR: [{ id: input.targetId }, { slug: input.targetId }],
        },
        select: { id: true },
      });
      if (!biz) throw new BadRequestException('Business not found');
      targetId = biz.id;
      targetParticipantType = 'BUSINESS';
    } else if (input.targetType === 'OPPORTUNITY') {
      const opp = await this.prisma.opportunityPost.findUnique({
        where: { id: input.targetId },
        select: { authorId: true },
      });
      if (!opp) throw new BadRequestException('Opportunity not found');
      targetId = opp.authorId;
      targetParticipantType = 'USER';
      anchorInput = { type: 'OPPORTUNITY', targetId: input.targetId };
    }

    if (targetParticipantType === 'USER' && input.userId === targetId) {
      throw new BadRequestException('You cannot message yourself');
    }

    const me = await this.participantService.ensurePersonalParticipant(input.userId);
    const target =
      targetParticipantType === 'USER'
        ? await this.participantService.ensurePersonalParticipant(targetId)
        : await this.participantService.ensureBusinessParticipant(targetId);

    // Advisory lock to prevent race conditions when checking/creating direct conversations
    const [id1, id2] = [me.id, target.id].sort();
    // Compute a 32-bit integer lock ID from the IDs and anchor
    let hash = 0;
    const str = `${id1}:${id2}:${anchorInput ? anchorInput.targetId : 'none'}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const lockId = Math.abs(hash);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

        // Look for an existing conversation
        const existing = await tx.conversation.findFirst({
          where: {
            type: 'DIRECT',
            ...(anchorInput?.type === 'OPPORTUNITY'
              ? { anchor: { opportunityId: anchorInput.targetId } }
              : anchorInput?.type === 'BUSINESS'
                ? { anchor: { businessId: anchorInput.targetId } }
                : { anchorId: null }),
            participants: {
              every: {
                participantId: { in: [me.id, target.id] },
              },
            },
          },
          include: { participants: true },
        });

        const isMatch = existing?.participants.length === 2;

        if (isMatch) {
          const domainConv = await this.repo.findById(existing.id);
          if (domainConv) return domainConv;
        }

        // Create new conversation
        const conversation = await this.repo.create({
          type: 'DIRECT',
          participantId: me.id,
          invitedParticipantIds: [target.id],
          ...(anchorInput ? { anchor: anchorInput } : {}),
        });

        if (anchorInput?.type === 'OPPORTUNITY') {
          await this.eventBus.publish('opportunity.conversation.started', {
            conversationId: conversation.id,
            opportunityId: anchorInput.targetId,
            initiatorId: me.id,
            authorId: target.id,
          });
        }

        return conversation;
      },
      { timeout: 10000 },
    );
  }
}
