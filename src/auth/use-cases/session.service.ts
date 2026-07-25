import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { SessionRevocationNotifier } from '../events/session-revocation.notifier.js';
import { RedisService } from '../../shared/redis/redis.service.js';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notifier: SessionRevocationNotifier,
    private readonly redisService: RedisService,
  ) {}

  private getRotationCacheKey(tokenHash: string): string {
    return `session:rotation_grace:${tokenHash}`;
  }

  /**
   * Generates a random refresh token and returns both the plaintext token (for the client)
   * and the SHA-256 hash (for the database).
   */
  private generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  /**
   * Parses the user agent string into a simple device name.
   */
  private deriveDeviceName(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';
    // Very basic parsing for MVP
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Postman')) return 'Postman API Client';
    return 'Unknown Device';
  }

  /**
   * Creates a new session and returns the access token and refresh token.
   */
  async createSession(
    accountId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const { token: refreshToken, hash: refreshTokenHash } = this.generateRefreshToken();

    // Set refresh token expiration (e.g. 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });

    const session = await this.prisma.session.create({
      data: {
        accountId,
        refreshTokenHash,
        deviceName: this.deriveDeviceName(userAgent),
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    const accessToken = this.jwtService.sign(
      {
        sub: accountId,
        whoami_kind: 'receipt',
        sessionId: session.id,
        sv: account.sessionVersion,
      },
      {
        expiresIn: '15m',
        issuer: 'show',
        audience: 'password-users',
      },
    );

    return { accessToken, refreshToken, expiresAt };
  }

  /**
   * Rotates a refresh token transactionally to prevent race conditions.
   */
  async refreshSession(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const hash = createHash('sha256').update(refreshToken).digest('hex');

    // Check if this token was rotated within the last 30 seconds (grace cache in Redis).
    // This protects against network retries, browser double-submits, and packet loss without false theft detection.
    const cachedRotation = await this.redisService.get<{
      accessToken: string;
      refreshToken: string;
      expiresAt: string | Date;
      userAgent?: string | null;
      ipAddress?: string | null;
    }>(this.getRotationCacheKey(hash));

    if (cachedRotation) {
      // Verify replay matches IP and User-Agent to prevent unauthorized replay from a different client/location
      const matchesUA = !cachedRotation.userAgent || cachedRotation.userAgent === userAgent;
      const matchesIP = !cachedRotation.ipAddress || cachedRotation.ipAddress === ipAddress;
      if (matchesUA && matchesIP) {
        return {
          accessToken: cachedRotation.accessToken,
          refreshToken: cachedRotation.refreshToken,
          expiresAt: new Date(cachedRotation.expiresAt),
        };
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findFirst({
        where: { refreshTokenHash: hash },
        include: { account: true },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (session.revokedAt) {
        // Token theft detected! Someone reused a revoked refresh token.
        // Revoke ALL sessions globally to secure the account.
        await tx.account.update({
          where: { id: session.accountId },
          data: { sessionVersion: { increment: 1 } },
        });
        // We defer notification until after the transaction or notify directly if it doesn't matter
        this.notifier.notifyGlobalRevoked(session.accountId);
        throw new ForbiddenException('Compromised refresh token detected. Account secured.');
      }

      if (session.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Mark the old session/token as revoked
      await tx.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      this.notifier.notifySessionRevoked(session.id);

      // Issue a new session/token (rotation)
      const { token: newRefreshToken, hash: newRefreshTokenHash } = this.generateRefreshToken();
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 30);

      const newSession = await tx.session.create({
        data: {
          accountId: session.accountId,
          refreshTokenHash: newRefreshTokenHash,
          deviceName: this.deriveDeviceName(userAgent) || session.deviceName,
          userAgent: userAgent ?? session.userAgent ?? null,
          ipAddress: ipAddress ?? session.ipAddress ?? null,
          expiresAt: newExpiresAt,
          lastUsedAt: new Date(),
        },
      });

      const accessToken = this.jwtService.sign(
        {
          sub: session.accountId,
          whoami_kind: 'receipt',
          sessionId: newSession.id,
          sv: session.account.sessionVersion,
        },
        {
          expiresIn: '15m',
          issuer: 'show',
          audience: 'password-users',
        },
      );

      return { accessToken, refreshToken: newRefreshToken, expiresAt: newExpiresAt };
    });

    // Cache the rotation in Redis for 30 seconds to support safe retries across distributed node instances
    await this.redisService.set(
      this.getRotationCacheKey(hash),
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
      },
      30, // 30 seconds base TTL
    );

    return result;
  }

  /**
   * Revokes a specific session.
   */
  async logoutDevice(sessionId: string, accountId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, accountId },
      data: { revokedAt: new Date() },
    });
    this.notifier.notifySessionRevoked(sessionId);
  }

  /**
   * Revokes all sessions and increments sessionVersion to invalidate existing Access Tokens.
   */
  async logoutAll(accountId: string) {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { sessionVersion: { increment: 1 } },
    });
    // Background job will cleanup orphaned sessions, but we can also aggressively revoke them here:
    await this.prisma.session.updateMany({
      where: { accountId },
      data: { revokedAt: new Date() },
    });
    this.notifier.notifyGlobalRevoked(accountId);
  }
}
