import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SearchUsersDto } from '../dto/search.dto.js';
import { MediaUrlService } from '../../media/application/services/media-url.service.js';

@Injectable()
export class UserSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
  ) {}

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
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
        },
        skip: offset,
        take: limit,
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          createdAt: true,
          media: {
            where: { role: 'AVATAR' },
            select: { provider: true, fileId: true, mimeType: true, version: true, format: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    const mappedUsers = users.map((user) => {
      const { media, ...rest } = user;
      return {
        ...rest,
        avatarUrl: media?.[0]
          ? this.mediaUrlService.getMediaUrl(
              media[0].provider,
              media[0].fileId,
              media[0].mimeType,
              media[0].version ?? undefined,
              media[0].format ?? undefined,
            )
          : null,
      };
    });

    return {
      items: mappedUsers,
      total,
      offset,
      limit,
    };
  }
}
