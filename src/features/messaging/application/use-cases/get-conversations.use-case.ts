import { Injectable } from '@nestjs/common';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { ConversationPreviewView } from '../../domain/types/messaging.types.js';
import { ParticipantService } from '../services/participant.service.js';

@Injectable()
export class GetConversationsUseCase {
  constructor(
    private readonly repo: IConversationRepository,
    private readonly participantService: ParticipantService,
  ) {}

  async execute(userId: string): Promise<ConversationPreviewView[]> {
    // A user can see conversations for all participants they control
    const participants = await this.participantService.getMyParticipants(userId);
    const participantIds = participants.map((p) => p.id);

    if (participantIds.length === 0) return [];
    return this.repo.findPreviewsByParticipantIds(participantIds);
  }
}
