import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class NearbyAudienceResolver {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves users within a given radius of a location.
   */
  async resolve(locationId: string, radiusKm: number = 5): Promise<string[]> {
    // 1. The coordinates are stored as geometry(Point, 4326) in PostGIS.
    // We find users whose active exploration coordinates are within `radiusKm` km.
    // The query automatically ignores invalid target locationIds since it's an inner join.

    // In PostGIS, ST_DWithin with geography type uses meters.
    const radiusMeters = radiusKm * 1000;

    const nearbyUsers = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT u.id
      FROM "users" u
      JOIN "locations" target_loc ON target_loc.id = ${locationId}
      WHERE u."activeExplorationLat" IS NOT NULL 
        AND u."activeExplorationLng" IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(u."activeExplorationLng", u."activeExplorationLat"), 4326)::geography,
          target_loc.coordinates::geography,
          ${radiusMeters}
        )
    `;

    return nearbyUsers.map((u) => u.id);
  }
}
