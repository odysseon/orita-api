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
    // We need to find users whose locationId points to a Location within `radiusKm` km.
    // For MVP, we assume users have a `locationId` set on their profile.
    // The query automatically ignores invalid target locationIds since it's an inner join.

    // In PostGIS, ST_DWithin with geography type uses meters.
    const radiusMeters = radiusKm * 1000;

    const nearbyUsers = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT u.id
      FROM "User" u
      JOIN "Location" u_loc ON u."locationId" = u_loc.id
      JOIN "Location" target_loc ON target_loc.id = ${locationId}
      WHERE ST_DWithin(
        u_loc.coordinates::geography,
        target_loc.coordinates::geography,
        ${radiusMeters}
      )
    `;

    return nearbyUsers.map((u) => u.id);
  }
}
