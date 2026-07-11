import { Injectable } from '@nestjs/common';
import { Geocoder, GeocoderCandidate } from '../infrastructure/geocoder.interface.js';
import {
  PrismaLocationRepository,
  LocationRecord,
} from '../infrastructure/prisma-location.repository.js';
import { IdentityService } from '../../../shared/identity/identity.service.js';
import type { RequestIdentity } from '@odysseon/whoami-adapter-nestjs';

@Injectable()
export class LocationsService {
  constructor(
    private readonly geocoder: Geocoder,
    private readonly repo: PrismaLocationRepository,
    private readonly identityService: IdentityService,
  ) {}

  /**
   * Search locations. Returns DB records first.
   * If fewer than 3 DB results, falls back to the geocoder for suggestions.
   * Geocoder results are NOT persisted here — only on explicit selection via `ensure()`.
   */
  async search(
    query: string,
    identity?: RequestIdentity,
  ): Promise<(LocationRecord & { persisted: boolean; isFollowed: boolean })[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const dbResults = await this.repo.searchByText(trimmed, 6);

    // Resolve user and followed locations
    let followedIds = new Set<string>();
    if (identity) {
      const user = await this.identityService.resolveUser(identity.accountId);
      if (user && dbResults.length > 0) {
        const ids = dbResults.map((r) => r.id);
        const follows = await this.repo.getFollowedLocationIds(user.id, ids);
        followedIds = new Set(follows);
      }
    }

    // Map-based canonical deduplication
    const resultsMap = new Map<
      string,
      LocationRecord & { persisted: boolean; isFollowed: boolean }
    >();
    const key = (provider: string, externalId: string) => `${provider}:${String(externalId)}`;

    // 1. Insert DB results
    for (const db of dbResults) {
      if (!db.provider || !db.externalId) continue;
      resultsMap.set(key(db.provider, db.externalId), {
        ...db,
        persisted: true,
        isFollowed: followedIds.has(db.id),
      });
    }

    if (resultsMap.size >= 3) {
      return Array.from(resultsMap.values());
    }

    // Supplement with provider results (not persisted yet)
    let providerResults: GeocoderCandidate[] = [];
    try {
      providerResults = await this.geocoder.search(trimmed);
    } catch {
      // Silently fall back to DB-only results
    }

    // 2. Insert Geocoder results if they don't already exist
    for (const p of providerResults) {
      const canonicalKey = key(p.provider, p.externalId);
      if (!resultsMap.has(canonicalKey)) {
        resultsMap.set(canonicalKey, {
          id: '', // Not yet in DB
          provider: p.provider,
          externalId: p.externalId,
          name: p.name,
          formattedAddress: p.formattedAddress,
          latitude: p.lat,
          longitude: p.lng,
          persisted: false,
          isFollowed: false,
        });
      }
    }

    return Array.from(resultsMap.values());
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
    let providerCandidate: GeocoderCandidate | null;
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
