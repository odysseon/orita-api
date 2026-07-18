export enum NearbyItemKind {
  OPPORTUNITY_POST = 'OPPORTUNITY_POST',
  EVENT = 'EVENT',
  BUSINESS_FLASH = 'BUSINESS_FLASH',
  EMERGENCY = 'EMERGENCY',
}

export interface NearbyItemDto {
  id: string;
  kind: NearbyItemKind;
  title: string;
  body?: string | undefined;
  subtype: string;
  status: string;
  location: {
    id: string;
    name: string;
    formattedAddress?: string | undefined;
  };
  author: {
    id: string;
    username: string;
    displayName?: string | undefined;
    avatarUrl?: string | undefined;
  };
  postedAs?:
    | {
        id: string;
        name: string;
        logoUrl?: string;
      }
    | undefined;
  media: { url: string; mimeType: string }[];
  expiresAt?: Date | undefined;
  createdAt: Date;

  _score?: number | undefined;
  _rankingVersion?: string | undefined;
}

export interface NearbyParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
  cursorScore?: number;
  cursorId?: string;
  types?: string[];
}

export interface DiscoveryPublisher {
  findNearby(params: NearbyParams): Promise<NearbyItemDto[]>;
}
