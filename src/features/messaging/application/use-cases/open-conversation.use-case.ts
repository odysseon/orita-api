import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { ParticipantService } from '../services/participant.service.js';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';

export interface OpenConversationInput {
  userId: string;
  targetType: 'USER' | 'BUSINESS';
  targetId: string;
}

@Injectable()
export class OpenConversationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly participantService: ParticipantService,
    private readonly repo: IConversationRepository,
  ) {}

  async execute(input: OpenConversationInput) {
    if (input.targetType === 'USER' && input.userId === input.targetId) {
      throw new BadRequestException('You cannot message yourself');
    }

    const me = await this.participantService.ensurePersonalParticipant(input.userId);
    const target =
      input.targetType === 'USER'
        ? await this.participantService.ensurePersonalParticipant(input.targetId)
        : await this.participantService.ensureBusinessParticipant(input.targetId);

    // Advisory lock to prevent race conditions when checking/creating direct conversations
    const [id1, id2] = [me.id, target.id].sort();
    // Compute a 32-bit integer lock ID from the IDs
    let hash = 0;
    const str = `${id1}:${id2}`;
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
        return await this.repo.create({
          type: 'DIRECT',
          participantId: me.id,
          invitedParticipantIds: [target.id],
        });
      },
      { timeout: 10000 },
    );
  }
}
