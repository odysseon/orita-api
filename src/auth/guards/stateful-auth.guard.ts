import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from '../../shared/identity/authenticated-request.interface.js';

@Injectable()
export class StatefulAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // OVERLAY PATTERN:
    // If there is no whoami identity on the request, it means either:
    // 1. This is a public route (so WhoamiAuthGuard skipped).
    // 2. WhoamiAuthGuard already threw an UnauthorizedException.
    // In either case, we don't need to enforce stateful session checks.
    if (!request.whoami?.identity) {
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      // 1. Verify the JWT cryptographically
      const payload = this.jwtService.verify<{ sub: string; sessionId: string; sv: number }>(token);
      const { sub: accountId, sessionId, sv } = payload;

      if (!accountId || !sessionId || sv === undefined) {
        throw new UnauthorizedException('Invalid token structure');
      }

      // 2. Fetch the session and account
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { account: true },
      });

      // 3. Perform stateful checks
      if (!session) throw new UnauthorizedException('Session not found');
      if (session.revokedAt) throw new UnauthorizedException('Session revoked');
      if (session.expiresAt < new Date()) throw new UnauthorizedException('Session expired');
      if (session.account.sessionVersion !== sv)
        throw new UnauthorizedException('Global session revoked');

      // Update the request with the authenticated identity so @CurrentIdentity works
      request.whoami = { identity: { accountId: session.accountId } };

      // We could also attach the sessionId if we need it for logout-device
      request.sessionId = sessionId;

      return true;
    } catch (e) {
      throw new UnauthorizedException(e instanceof Error ? e.message : 'Invalid session');
    }
  }
}
