export interface GeocoderCandidate {
  externalId?: string;
  provider: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

export abstract class Geocoder {
  abstract search(query: string): Promise<GeocoderCandidate[]>;
  abstract reverse(lat: number, lng: number): Promise<GeocoderCandidate | null>;
}
