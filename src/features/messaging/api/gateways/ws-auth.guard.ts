import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    const authPayload = client.handshake.auth as Record<string, unknown> | undefined;
    const rawToken: string | undefined =
      (typeof authPayload?.['token'] === 'string' ? authPayload['token'] : undefined) ??
      client.handshake.headers?.authorization;

    if (!rawToken) {
      throw new WsException('Missing authentication token.');
    }

    const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;

    try {
      // 1. Verify cryptographically
      const payload = this.jwtService.verify<{ sub: string; sessionId: string; sv: number }>(token);
      const { sub: accountId, sessionId, sv } = payload;

      if (!accountId || !sessionId || sv === undefined) {
        throw new WsException('Invalid token structure');
      }

      // 2. Stateful session lookup
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { account: true },
      });

      if (!session) throw new WsException('Session not found');
      if (session.revokedAt) throw new WsException('Session revoked');
      if (session.expiresAt < new Date()) throw new WsException('Session expired');
      if (session.account.sessionVersion !== sv) throw new WsException('Global session revoked');

      // 3. Attach trusted identity to socket
      (client.data as Record<string, unknown>)['identity'] = { accountId };
      (client.data as Record<string, unknown>)['sessionId'] = sessionId;
      return true;
    } catch (err) {
      this.logger.warn('WebSocket auth failed', err);
      throw new WsException('Invalid or expired token.');
    }
  }
}
