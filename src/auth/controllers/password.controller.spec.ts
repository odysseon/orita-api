import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordAuthController } from './password.controller.js';
import { ConflictException } from '@nestjs/common';
import 'reflect-metadata';

describe('PasswordAuthController - Consistent Auth and AddPassword', () => {
  let controller: PasswordAuthController;
  let mockPasswordMethods: {
    initiateReset: ReturnType<typeof vi.fn>;
    verifyResetCode: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
    addPasswordToAccount?: ReturnType<typeof vi.fn>; // Optional because it might not be initialized in all tests
  };
  let mockPrisma: {
    passwordHash: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPasswordMethods = {
      initiateReset: vi.fn(),
      verifyResetCode: vi.fn(),
      resetPassword: vi.fn(),
      changePassword: vi.fn(),
      addPasswordToAccount: vi.fn().mockResolvedValue(true),
    };
    mockPrisma = {
      passwordHash: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    controller = new PasswordAuthController(
      mockPasswordMethods as never,
      {} as never,
      {} as never,
      mockPrisma as never,
      {} as never,
    );
  });

  it('verifies that addPassword does not have @Public() metadata set', () => {
    const metadata = Reflect.getMetadata('isPublic', controller.addPassword);
    expect(metadata).toBeUndefined();
  });

  it('succeeds for an authenticated user without password', async () => {
    const result = await controller.addPassword({ password: 'NewStrongPassword123!' }, {
      accountId: 'acc_123',
    } as unknown as never);
    expect(result).toEqual({ success: true });
    expect(mockPasswordMethods.addPasswordToAccount).toHaveBeenCalledWith({
      accountId: 'acc_123',
      password: 'NewStrongPassword123!',
    });
  });

  it('fails with ConflictException if user already has a password set', async () => {
    mockPrisma.passwordHash.findUnique.mockResolvedValueOnce({
      id: 'hash_1',
      accountId: 'acc_123',
    });

    await expect(
      controller.addPassword({ password: 'NewStrongPassword123!' }, {
        accountId: 'acc_123',
      } as unknown as never),
    ).rejects.toThrow(ConflictException);
  });
});
