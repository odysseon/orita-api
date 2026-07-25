import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from './users.service.js';
import { BadRequestException } from '@nestjs/common';
import { MediaRole, StorageProvider, UploadOwnerType } from '../../../generated/prisma/client.js';

describe('UsersService - Avatar Upload Intent Hardening', () => {
  let service: UsersService;
  let mockUserRepo: any;
  let mockMediaStorage: any;
  let mockPrisma: any;

  const mockUser = {
    id: 'user_123',
    accountId: 'account_123',
    username: 'testuser',
    role: 'USER' as const,
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'ACTIVE' as const,
    deletedAt: null,
    avatarUrl: null,
  };

  const validIntent = {
    id: 'intent_abc',
    ownerType: UploadOwnerType.USER,
    ownerId: 'user_123',
    role: MediaRole.AVATAR,
    provider: StorageProvider.CLOUDINARY,
    folder: 'users/user_123/avatar',
    publicId: 'media_xyz',
    createdById: 'user_123',
    consumedAt: null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // future
  };

  beforeEach(() => {
    mockUserRepo = {
      findByAccountId: vi.fn().mockResolvedValue(mockUser),
      clearCache: vi.fn().mockResolvedValue(true),
    };
    mockMediaStorage = {
      getMetadata: vi.fn().mockResolvedValue({
        mimeType: 'image/png',
        format: 'png',
        bytes: 1024,
        width: 400,
        height: 400,
      }),
    };
    mockPrisma = {
      uploadIntent: {
        findUnique: vi.fn().mockResolvedValue(validIntent),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const tx = {
          uploadIntent: {
            update: vi.fn().mockResolvedValue(true),
          },
          media: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            create: vi.fn().mockImplementation(async ({ data }) => data),
          },
        };
        return callback(tx);
      }),
    };

    service = new UsersService(mockUserRepo, mockMediaStorage, mockPrisma);
  });

  it('rejects expired intent', async () => {
    mockPrisma.uploadIntent.findUnique.mockResolvedValueOnce({
      ...validIntent,
      expiresAt: new Date(Date.now() - 10000), // past date
    });

    await expect(
      service.consumeAvatarUploadIntent('account_123', {
        intentId: 'intent_abc',
        publicId: 'media_xyz',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects mismatched or wrong publicId', async () => {
    await expect(
      service.consumeAvatarUploadIntent('account_123', {
        intentId: 'intent_abc',
        publicId: 'wrong_public_id',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects reused or already consumed intent', async () => {
    mockPrisma.uploadIntent.findUnique.mockResolvedValueOnce({
      ...validIntent,
      consumedAt: new Date(),
    });

    await expect(
      service.consumeAvatarUploadIntent('account_123', {
        intentId: 'intent_abc',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('fetches metadata using stored publicId and binds uploadIntentId', async () => {
    const txMediaCreate = vi.fn().mockImplementation(async ({ data }) => data);
    mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
      const tx = {
        uploadIntent: { update: vi.fn().mockResolvedValue(true) },
        media: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: txMediaCreate },
      };
      return callback(tx);
    });

    await service.consumeAvatarUploadIntent('account_123', {
      intentId: 'intent_abc',
      version: 'v12345',
    });

    expect(mockMediaStorage.getMetadata).toHaveBeenCalledWith('media_xyz');
    expect(txMediaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fileId: 'media_xyz',
        version: 'v12345',
        provider: StorageProvider.CLOUDINARY,
        uploadIntentId: 'intent_abc',
        role: MediaRole.AVATAR,
        userId: 'user_123',
      }),
    });
  });
});
