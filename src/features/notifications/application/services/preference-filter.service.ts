import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class PreferenceFilterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filters a list of userIds down to only those who have opted in
   * to the specified preference category.
   */
  async filter(userIds: string[], category: string): Promise<string[]> {
    if (!userIds.length) return [];

    // Valid categories based on our Prisma schema boolean fields
    const validCategories = ['messages', 'nearbyDiscoveries', 'following', 'security', 'marketing'];

    if (!validCategories.includes(category)) {
      // If it's an unknown category, default to allowing it to be safe,
      // or we could strictly filter. Let's allow if unknown.
      return userIds;
    }

    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        [category]: true, // dynamically select the boolean column
      },
    });

    // We assume default is true if no preference record exists (based on schema defaults).
    // So if a user doesn't have a record, they are included.

    const optedOutUsers = new Set<string>(
      (preferences as Record<string, unknown>[])
        .filter((p) => p[category] === false)
        .map((p) => p['userId'] as string),
    );

    return userIds.filter((id) => !optedOutUsers.has(id));
  }
}
