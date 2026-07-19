import { Injectable, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ConversationView } from '../../domain/types/messaging.types.js';

@Injectable()
export class ConversationParticipantResolver {
  /**
   * Resolves the active participant ID for the authenticated user in the given conversation.
   * Throws ForbiddenException if the user is not a participant.
   * Throws InternalServerErrorException if the user has multiple participants in the same conversation.
   *
   * @param conversation The conversation to check against.
   * @param requesterParticipantIds The list of participant IDs owned by the authenticated user.
   * @returns The resolved active participant ID.
   */
  resolve(conversation: ConversationView, requesterParticipantIds: string[]): string {
    const matchedIds = conversation.participantIds.filter((id) =>
      requesterParticipantIds.includes(id),
    );

    if (matchedIds.length === 0) {
      throw new ForbiddenException('You are not a participant of this conversation.');
    }

    if (matchedIds.length > 1) {
      throw new InternalServerErrorException(
        'User has multiple participants in this conversation. Ambiguous context.',
      );
    }

    return matchedIds[0]!;
  }
}
