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
import { WsAuthGuard } from '../../../messaging/api/gateways/ws-auth.guard.js';
import { IdentityService } from '../../../../shared/identity/identity.service.js';
import { NotificationViewDto } from '../dto/response.dto.js';

@WebSocketGateway({ namespace: '/ws/notifications', cors: { origin: '*', credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly identityService: IdentityService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected to notifications: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected from notifications: ${client.id}`);
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

    const user = await this.identityService.resolveUser(data.identity.accountId);
    if (!user) throw new WsException('User not found.');

    await client.join(this.roomFor(user.id));
    this.logger.log(`${client.id} joined ${this.roomFor(user.id)}`);
  }
}
