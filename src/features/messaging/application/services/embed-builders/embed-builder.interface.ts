import { MessageEmbedType } from '../../../../../../generated/prisma/client.js';
import { EmbedSnapshot } from '../../../domain/types/messaging.types.js';

export interface IEmbedBuilder {
  supports(type: MessageEmbedType): boolean;
  build(targetId: string): Promise<EmbedSnapshot>;
}
