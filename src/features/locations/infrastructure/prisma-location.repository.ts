import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { GeocoderCandidate } from './geocoder.interface.js';

export interface LocationRecord {
  id: string;
  name: string;
  formattedAddress: string | null;
  latitude: number;
  longitude: number;
}

@Injectable()
export class PrismaLocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchByText(query: string, limit = 6): Promise<LocationRecord[]> {
    const term = `%${query.toLowerCase()}%`;
    return this.prisma.location.findMany({
      where: {
        OR: [
          { searchText: { contains: term } },
          { name: { contains: query, mode: 'insensitive' } },
          { formattedAddress: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        formattedAddress: true,
        latitude: true,
        longitude: true,
      },
    });
  }

  async findNearby(lat: number, lng: number, radiusMeters = 500): Promise<LocationRecord | null> {
    // PostGIS spatial query to find nearest location within radius
    const results = await this.prisma.$queryRaw<LocationRecord[]>`
      SELECT id, name, "formattedAddress", latitude, longitude
      FROM locations
      WHERE ST_DWithin(
        coordinates::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
      ORDER BY ST_Distance(
        coordinates::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      )
      LIMIT 1
    `;
    return results[0] ?? null;
  }

  async upsert(candidate: GeocoderCandidate): Promise<LocationRecord> {
    const searchText = [candidate.name, candidate.formattedAddress]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const coordinatesRaw = `ST_SetSRID(ST_MakePoint(${candidate.lng}, ${candidate.lat}), 4326)`;

    // Check if already exists by provider+externalId
    const existing = await this.prisma.location.findFirst({
      where: { provider: candidate.provider, externalId: candidate.externalId },
      select: { id: true, name: true, formattedAddress: true, latitude: true, longitude: true },
    });

    if (existing) return existing;

    // Create using raw SQL to set geometry column
    await this.prisma.$executeRaw`
      INSERT INTO locations (id, "externalId", provider, name, "formattedAddress", "searchText", latitude, longitude, coordinates, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${candidate.externalId},
        ${candidate.provider},
        ${candidate.name},
        ${candidate.formattedAddress},
        ${searchText},
        ${candidate.lat},
        ${candidate.lng},
        ${coordinatesRaw}::geometry,
        NOW(),
        NOW()
      )
      ON CONFLICT (provider, "externalId") DO UPDATE SET
        name = EXCLUDED.name,
        "formattedAddress" = EXCLUDED."formattedAddress",
        "searchText" = EXCLUDED."searchText",
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        "updatedAt" = NOW()
    `;

    const created = await this.prisma.location.findFirst({
      where: { provider: candidate.provider, externalId: candidate.externalId },
      select: { id: true, name: true, formattedAddress: true, latitude: true, longitude: true },
    });

    return created!;
  }

  async findById(id: string): Promise<LocationRecord | null> {
    return this.prisma.location.findUnique({
      where: { id },
      select: { id: true, name: true, formattedAddress: true, latitude: true, longitude: true },
    });
  }
}
