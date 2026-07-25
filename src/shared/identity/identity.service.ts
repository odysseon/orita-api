import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { User } from '../../../generated/prisma/client.js';

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves an accountId to a User.
   * Throws NotFoundException if the user profile does not exist.
   */
  async resolveUserOrThrow(accountId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt !== null) {
      throw new UnauthorizedException(
        'Your session has expired or your account is inactive. Please sign in again.',
      );
    }

    return user;
  }

  /**
   * Resolves an accountId to a User.
   * Returns null if the user profile does not exist or is inactive.
   */
  async resolveUser(accountId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { accountId },
    });
    if (!user || user.status !== 'ACTIVE' || user.deletedAt !== null) return null;
    return user;
  }
}
