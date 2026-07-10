import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { Participant } from '../../../../../generated/prisma/client.js';

@Injectable()
export class ParticipantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lazily creates or returns the personal participant for a user.
   */
  async ensurePersonalParticipant(userId: string): Promise<Participant> {
    const existing = await this.prisma.participant.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return this.prisma.participant.create({
      data: { userId },
    });
  }

  /**
   * Lazily creates or returns the business participant.
   */
  async ensureBusinessParticipant(businessProfileId: string): Promise<Participant> {
    const existing = await this.prisma.participant.findUnique({
      where: { businessProfileId },
    });
    if (existing) return existing;

    return this.prisma.participant.create({
      data: { businessProfileId },
    });
  }

  /**
   * Returns all participants a user can speak as (personal + businesses they own).
   */
  async getMyParticipants(userId: string): Promise<Participant[]> {
    const personal = await this.ensurePersonalParticipant(userId);
    
    const businesses = await this.prisma.businessProfile.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const businessParticipants = await Promise.all(
      businesses.map((b) => this.ensureBusinessParticipant(b.id)),
    );

    return [personal, ...businessParticipants];
  }

  /**
   * Validates that the given user is authorized to send a message as the given participant.
   */
  async assertCanSpeakAs(userId: string, participantId: string): Promise<Participant> {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: { business: true },
    });

    if (!participant) {
      throw new ForbiddenException('Participant not found');
    }

    if (participant.userId) {
      if (participant.userId !== userId) {
        throw new ForbiddenException('You cannot speak as this user');
      }
    } else if (participant.businessProfileId) {
      if (participant.business?.ownerId !== userId) {
        throw new ForbiddenException('You do not own this business');
      }
    }

    return participant;
  }
}
