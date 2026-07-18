import { Injectable } from '@nestjs/common';
import { Geocoder, GeocoderCandidate } from './geocoder.interface.js';

interface NominatimResult {
  place_id: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

@Injectable()
export class NominatimGeocoder implements Geocoder {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private readonly userAgent = 'OritaAPI/1.0 (contact@orita.ng)';

  async search(query: string): Promise<GeocoderCandidate[]> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '6');

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': this.userAgent },
    });

    if (!response.ok) return [];

    const results: NominatimResult[] = (await response.json()) as NominatimResult[];
    return results.map((r) => this.#toCandidate(r));
  }

  async reverse(lat: number, lng: number): Promise<GeocoderCandidate | null> {
    const url = new URL(`${this.baseUrl}/reverse`);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': this.userAgent },
    });

    if (!response.ok) return null;

    const result: NominatimResult = (await response.json()) as NominatimResult;
    if (!result?.lat) return null;
    return this.#toCandidate(result);
  }

  #toCandidate(r: NominatimResult): GeocoderCandidate {
    const a = r.address ?? {};
    // Build a short human-readable name from the most specific available part
    const shortName =
      r.name ||
      a.neighbourhood ||
      a.suburb ||
      a.city ||
      a.town ||
      a.village ||
      (r.display_name?.split(',')[0] || '').trim();

    return {
      externalId: String(r.place_id),
      provider: 'osm',
      name: shortName,
      formattedAddress: r.display_name,
      ...(a.country_code ? { countryCode: a.country_code.toUpperCase() } : {}),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    };
  }
}
