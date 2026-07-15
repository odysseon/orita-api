import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SearchUsersDto } from '../dto/search.dto.js';

@Injectable()
export class UserSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchUsersDto) {
    if (!dto.q || dto.q.trim() === '') {
      return {
        items: [],
        total: 0,
        offset: dto.offset ?? 0,
        limit: dto.limit ?? 20,
      };
    }

    const query = dto.q.trim();
    const limit = dto.limit ?? 20;
    const offset = dto.offset ?? 0;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            // If display name is added later, add it here
          ],
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      items: users,
      total,
      offset,
      limit,
    };
  }
}
