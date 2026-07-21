import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { WsAuthGuard } from '../../../messaging/api/gateways/ws-auth.guard.js';
import { IdentityService } from '../../../../shared/identity/identity.service.js';
import { NotificationViewDto } from '../dto/response.dto.js';

@WebSocketGateway({ namespace: '/ws/notifications', cors: { origin: '*', credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  private sessionSockets = new Map<string, Set<Socket>>();
  private accountSockets = new Map<string, Set<Socket>>();

  constructor(private readonly identityService: IdentityService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected to notifications: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected from notifications: ${client.id}`);
    const data = client.data as { sessionId?: string; identity?: { accountId: string } };
    if (data.sessionId) {
      this.sessionSockets.get(data.sessionId)?.delete(client);
    }
    if (data.identity?.accountId) {
      this.accountSockets.get(data.identity.accountId)?.delete(client);
    }
  }

  private registerSocket(client: Socket) {
    const data = client.data as { sessionId?: string; identity?: { accountId: string } };
    if (data.sessionId) {
      if (!this.sessionSockets.has(data.sessionId)) {
        this.sessionSockets.set(data.sessionId, new Set());
      }
      this.sessionSockets.get(data.sessionId)!.add(client);
    }
    if (data.identity?.accountId) {
      if (!this.accountSockets.has(data.identity.accountId)) {
        this.accountSockets.set(data.identity.accountId, new Set());
      }
      this.accountSockets.get(data.identity.accountId)!.add(client);
    }
  }

  @OnEvent('session.revoked')
  handleSessionRevoked(payload: { sessionId: string }) {
    const sockets = this.sessionSockets.get(payload.sessionId);
    if (sockets) {
      this.logger.log(
        `Force disconnecting ${sockets.size} notification sockets for revoked session ${payload.sessionId}`,
      );
      for (const socket of sockets) {
        socket.disconnect(true);
      }
      this.sessionSockets.delete(payload.sessionId);
    }
  }

  @OnEvent('account.sessions.revoked')
  handleGlobalRevoked(payload: { accountId: string }) {
    const sockets = this.accountSockets.get(payload.accountId);
    if (sockets) {
      this.logger.log(
        `Force disconnecting ${sockets.size} notification sockets for global account revocation ${payload.accountId}`,
      );
      for (const socket of sockets) {
        socket.disconnect(true);
      }
      this.accountSockets.delete(payload.accountId);
    }
  }

  private roomFor(userId: string): string {
    return `user_notifications:${userId}`;
  }

  broadcastNotification(userId: string, notification: NotificationViewDto): void {
    this.server.to(this.roomFor(userId)).emit('notification:new', notification);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('notifications:join')
  async handleJoin(@ConnectedSocket() client: Socket): Promise<void> {
    const data = client.data as { identity?: { accountId: string } };
    if (!data.identity) throw new WsException('Unauthorized');

    this.registerSocket(client);

    const user = await this.identityService.resolveUser(data.identity.accountId);
    if (!user) throw new WsException('User not found.');

    await client.join(this.roomFor(user.id));
    this.logger.log(`${client.id} joined ${this.roomFor(user.id)}`);
  }
}
