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

    if (!user) {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }

    return user;
  }

  /**
   * Resolves an accountId to a User.
   * Returns null if the user profile does not exist.
   */
  async resolveUser(accountId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { accountId },
    });
  }
}
