import { NearbyItemDto } from '../../domain/discovery-publisher.interface.js';
export type { NearbyItemDto } from '../../domain/discovery-publisher.interface.js';
export { NearbyItemKind } from '../../domain/discovery-publisher.interface.js';

export class NearbyResultPageDto {
  items!: NearbyItemDto[];
  rankingVersion!: string;
  cursorScore?: number | undefined;
  cursorId?: string | undefined;
  hasMore!: boolean;
}
