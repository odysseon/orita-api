import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicUsersService } from './public-users.service.js';
import { IdentityService } from '../../shared/identity/identity.service.js';
import { UserSearchService } from '../../features/search/application/user-search.service.js';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '../../../generated/prisma/client.js';

describe('User Status Enforcement (Active Constraints)', () => {
  let publicUsersService: PublicUsersService;
  let identityService: IdentityService;
  let searchService: UserSearchService;
  let mockPrisma: any;
  let mockUserRepo: any;

  beforeEach(() => {
    mockUserRepo = {
      findByAccountId: vi
        .fn()
        .mockResolvedValue({ id: 'active_follower', status: 'ACTIVE', deletedAt: null }),
    };

    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      userFollow: {
        upsert: vi.fn().mockResolvedValue(true),
      },
      $transaction: vi.fn().mockImplementation(async (queries: unknown[]) => {
        return Promise.all(queries);
      }),
    };

    publicUsersService = new PublicUsersService(mockPrisma, mockUserRepo, {} as any);
    identityService = new IdentityService(mockPrisma);
    searchService = new UserSearchService(mockPrisma, {} as any);
  });

  it('inactive users return 404 from public profile', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);

    await expect(publicUsersService.getPublicProfile('deleted_user')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          username: 'deleted_user',
          status: UserStatus.ACTIVE,
          deletedAt: null,
        }),
      }),
    );
  });

  it('pending deletion users cannot be followed', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);

    await expect(
      publicUsersService.followUser('pending_deletion_user', 'follower_acc'),
    ).rejects.toThrow(NotFoundException);
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        username: 'pending_deletion_user',
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });
  });

  it('deleted/inactive users cannot resolve identity (throws UnauthorizedException)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'deleted_id',
      accountId: 'acc_deleted',
      status: 'PENDING_DELETION',
      deletedAt: new Date(),
    });

    await expect(identityService.resolveUserOrThrow('acc_deleted')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('inactive users are excluded from user search queries and count', async () => {
    await searchService.search({ q: 'test' });

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: UserStatus.ACTIVE,
          deletedAt: null,
        }),
      }),
    );
    expect(mockPrisma.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: UserStatus.ACTIVE,
          deletedAt: null,
        }),
      }),
    );
  });
});
