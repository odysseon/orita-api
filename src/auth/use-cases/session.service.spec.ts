import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from './session.service.js';
import { ForbiddenException } from '@nestjs/common';
import { createHash } from 'crypto';

describe('SessionService - Refresh Token Rotation & Grace Cache', () => {
  let service: SessionService;
  let mockPrisma: any;
  let mockJwt: any;
  let mockNotifier: any;
  let mockRedis: any;
  let cacheStore: Record<string, any>;

  beforeEach(() => {
    cacheStore = {};
    mockRedis = {
      get: vi.fn().mockImplementation(async (key: string) => cacheStore[key] ?? null),
      set: vi.fn().mockImplementation(async (key: string, val: any) => {
        cacheStore[key] = val;
      }),
    };

    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const tx = {
          session: {
            findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
              if (
                where.refreshTokenHash === createHash('sha256').update('valid-token').digest('hex')
              ) {
                return {
                  id: 'session_1',
                  accountId: 'acc_1',
                  refreshTokenHash: where.refreshTokenHash,
                  revokedAt: null,
                  expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                  account: { sessionVersion: 1 },
                };
              }
              if (
                where.refreshTokenHash ===
                createHash('sha256').update('revoked-token').digest('hex')
              ) {
                return {
                  id: 'session_2',
                  accountId: 'acc_1',
                  refreshTokenHash: where.refreshTokenHash,
                  revokedAt: new Date(Date.now() - 10000),
                  expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                  account: { sessionVersion: 1 },
                };
              }
              return null;
            }),
            update: vi.fn().mockResolvedValue(true),
            create: vi.fn().mockResolvedValue({ id: 'session_new', accountId: 'acc_1' }),
          },
          account: {
            update: vi.fn().mockResolvedValue(true),
          },
        };
        return callback(tx);
      }),
    };

    mockJwt = {
      sign: vi.fn().mockReturnValue('mock_access_token'),
    };

    mockNotifier = {
      notifySessionRevoked: vi.fn(),
      notifyGlobalRevoked: vi.fn(),
    };

    service = new SessionService(mockPrisma, mockJwt, mockNotifier, mockRedis);
  });

  it('successfully refreshes a valid session and sets grace cache in Redis', async () => {
    const result = await service.refreshSession('valid-token', 'TestBrowser/1.0', '192.168.1.1');
    expect(result.accessToken).toBe('mock_access_token');
    expect(result.refreshToken).toBeDefined();

    const hash = createHash('sha256').update('valid-token').digest('hex');
    expect(mockRedis.set).toHaveBeenCalledWith(
      `session:rotation_grace:${hash}`,
      expect.objectContaining({ accessToken: 'mock_access_token' }),
      30,
    );
  });

  it('returns cached tokens on immediate retry within grace window (same IP & UA)', async () => {
    const hash = createHash('sha256').update('cached-token').digest('hex');
    const cachedEntry = {
      accessToken: 'cached_access',
      refreshToken: 'cached_refresh',
      expiresAt: new Date(Date.now() + 30000).toISOString(),
      userAgent: 'TestBrowser/1.0',
      ipAddress: '192.168.1.1',
    };
    cacheStore[`session:rotation_grace:${hash}`] = cachedEntry;

    const result = await service.refreshSession('cached-token', 'TestBrowser/1.0', '192.168.1.1');
    expect(result.accessToken).toBe('cached_access');
    expect(result.refreshToken).toBe('cached_refresh');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects replay from different IP address even if cached in grace window', async () => {
    const hash = createHash('sha256').update('cached-token-ip-diff').digest('hex');
    cacheStore[`session:rotation_grace:${hash}`] = {
      accessToken: 'cached_access',
      refreshToken: 'cached_refresh',
      expiresAt: new Date(Date.now() + 30000).toISOString(),
      userAgent: 'TestBrowser/1.0',
      ipAddress: '192.168.1.1',
    };

    await expect(
      service.refreshSession('cached-token-ip-diff', 'TestBrowser/1.0', '10.0.0.99'),
    ).rejects.toThrow();
  });

  it('rejects replay from different User-Agent even if cached in grace window', async () => {
    const hash = createHash('sha256').update('cached-token-ua-diff').digest('hex');
    cacheStore[`session:rotation_grace:${hash}`] = {
      accessToken: 'cached_access',
      refreshToken: 'cached_refresh',
      expiresAt: new Date(Date.now() + 30000).toISOString(),
      userAgent: 'TestBrowser/1.0',
      ipAddress: '192.168.1.1',
    };

    await expect(
      service.refreshSession('cached-token-ua-diff', 'DifferentBrowser/2.0', '192.168.1.1'),
    ).rejects.toThrow();
  });

  it('triggers token theft global revocation if retry occurs after grace period (no cache, revoked DB token)', async () => {
    await expect(
      service.refreshSession('revoked-token', 'TestBrowser/1.0', '192.168.1.1'),
    ).rejects.toThrow(ForbiddenException);
    expect(mockNotifier.notifyGlobalRevoked).toHaveBeenCalledWith('acc_1');
  });
});
