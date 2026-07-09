import { Injectable } from '@nestjs/common';
import { Geocoder, GeocoderCandidate } from '../infrastructure/geocoder.interface.js';
import {
  PrismaLocationRepository,
  LocationRecord,
} from '../infrastructure/prisma-location.repository.js';

@Injectable()
export class LocationsService {
  constructor(
    private readonly geocoder: Geocoder,
    private readonly repo: PrismaLocationRepository,
  ) {}

  /**
   * Search locations. Returns DB records first.
   * If fewer than 3 DB results, falls back to the geocoder for suggestions.
   * Geocoder results are NOT persisted here — only on explicit selection via `ensure()`.
   */
  async search(query: string): Promise<(LocationRecord & { persisted: boolean })[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const dbResults = await this.repo.searchByText(trimmed, 6);

    if (dbResults.length >= 3) {
      return dbResults.map((r) => ({ ...r, persisted: true }));
    }

    // Supplement with provider results (not persisted yet)
    let providerResults: GeocoderCandidate[] = [];
    try {
      providerResults = await this.geocoder.search(trimmed);
    } catch {
      // Silently fall back to DB-only results
    }

    const providerMapped = providerResults
      .filter((p) => !dbResults.some((d) => d.name === p.name))
      .map((p) => ({
        id: '', // Not yet in DB — client must call ensure() on selection
        externalId: p.externalId,
        provider: p.provider,
        name: p.name,
        formattedAddress: p.formattedAddress,
        latitude: p.lat,
        longitude: p.lng,
        persisted: false,
      }));

    return [...dbResults.map((r) => ({ ...r, persisted: true })), ...providerMapped];
  }

  /**
   * Persist-on-selection: called when user explicitly chooses a provider suggestion.
   * Idempotent — returns existing record if already in DB.
   */
  async ensure(candidate: GeocoderCandidate): Promise<LocationRecord> {
    return this.repo.upsert(candidate);
  }

  /**
   * Reverse geocode a GPS coordinate. Persists immediately (user explicitly requested GPS).
   */
  async reverseGeocode(lat: number, lng: number): Promise<LocationRecord | null> {
    // Check nearby DB first
    const nearby = await this.repo.findNearby(lat, lng, 500);
    if (nearby) return nearby;

    // Fall back to provider
    let providerCandidate: GeocoderCandidate | null = null;
    try {
      providerCandidate = await this.geocoder.reverse(lat, lng);
    } catch {
      return null;
    }

    if (!providerCandidate) return null;
    return this.repo.upsert(providerCandidate);
  }

  async findById(id: string): Promise<LocationRecord | null> {
    return this.repo.findById(id);
  }
}
