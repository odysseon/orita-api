import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from './ws-auth.guard.js';
import { IConversationRepository } from '../../domain/ports/conversation.repository.port.js';
import { IRealtimeGateway } from '../../domain/ports/realtime.gateway.port.js';
import { SendMessageUseCase } from '../../application/use-cases/send-message.use-case.js';
import { MarkMessagesReadUseCase } from '../../application/use-cases/mark-messages-read.use-case.js';
import { ParticipantService } from '../../application/services/participant.service.js';
import { IdentityService } from '../../../../shared/identity/identity.service.js';
import {
  WsSendMessagePayload,
  WsJoinConversationPayload,
  WsMarkReadPayload,
  WsMessageNewEvent,
  WsReadReceiptEvent,
} from '../dto/ws-events.dto.js';
import { MessageView, SendMessageInput } from '../../domain/types/messaging.types.js';

@WebSocketGateway({ namespace: '/ws/messaging', cors: { origin: '*', credentials: true } })
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, IRealtimeGateway
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly identityService: IdentityService,
    private readonly conversationRepo: IConversationRepository,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly markReadUseCase: MarkMessagesReadUseCase,
    private readonly participantService: ParticipantService,
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async resolveParticipantIds(accountId: string): Promise<string[]> {
    const user = await this.identityService.resolveUser(accountId);
    if (!user) throw new WsException('User not found.');
    const participants = await this.participantService.getMyParticipants(user.id);
    return participants.map((p) => p.id);
  }

  private roomFor(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  // ─── IRealtimeGateway implementation ──────────────────────────────────────

  broadcastMessage(conversationId: string, message: MessageView): void {
    const event: WsMessageNewEvent = { conversationId, message };
    this.server.to(this.roomFor(conversationId)).emit('message:new', event);
  }

  broadcastReadReceipt(
    conversationId: string,
    messageId: string,
    participantId: string,
    readAt: Date,
  ): void {
    const event: WsReadReceiptEvent = { conversationId, messageId, participantId, readAt };
    this.server.to(this.roomFor(conversationId)).emit('message:read', event);
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('conversation:join')
  async handleJoin(
    @MessageBody() payload: WsJoinConversationPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const data = client.data as { identity?: { accountId: string } };
    if (!data.identity) throw new WsException('Unauthorized');

    const participantIds = await this.resolveParticipantIds(data.identity.accountId);

    // We can't simply check one participant anymore. We must check if any of them is in the conversation.
    const conversation = await this.conversationRepo.findById(payload.conversationId);
    if (!conversation) throw new WsException('Conversation not found');

    const isParticipant = conversation.participantIds.some((id) => participantIds.includes(id));
    if (!isParticipant) {
      throw new WsException('You are not a participant of this conversation.');
    }

    await client.join(this.roomFor(payload.conversationId));
    this.logger.log(`${client.id} joined ${this.roomFor(payload.conversationId)}`);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody() payload: WsSendMessagePayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const data = client.data as { identity?: { accountId: string } };
    if (!data.identity) throw new WsException('Unauthorized');

    const participantIds = await this.resolveParticipantIds(data.identity.accountId);

    const input: Omit<SendMessageInput, 'participantId'> = {
      conversationId: payload.conversationId,
      ...(payload.content ? { content: payload.content } : {}),
      ...(payload.mediaUrl ? { mediaUrl: payload.mediaUrl } : {}),
      ...(payload.mediaType ? { mediaType: payload.mediaType } : {}),
      ...(payload.embeds ? { embeds: payload.embeds } : {}),
    };

    const message = await this.sendMessageUseCase.execute(input, participantIds);
    this.broadcastMessage(payload.conversationId, message);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:read')
  async handleMarkRead(
    @MessageBody() payload: WsMarkReadPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const data = client.data as { identity?: { accountId: string } };
    if (!data.identity) throw new WsException('Unauthorized');

    const participantIds = await this.resolveParticipantIds(data.identity.accountId);

    await this.markReadUseCase.execute(
      {
        conversationId: payload.conversationId,
        messageIds: payload.messageIds,
      },
      participantIds,
    );

    const readAt = new Date();
    // In WS we might need to know WHICH participant marked it read,
    // ideally the use case returns the resolved participantId,
    // but for now we broadcast with the first valid one or we omit.
    // For now we'll just broadcast to everyone that it was read without specifying the exact participantId
    for (const messageId of payload.messageIds) {
      // It's a broadcast to the room, so all participants update their read receipts
      // In a real app we'd broadcast the exact participantId
      this.broadcastReadReceipt(payload.conversationId, messageId, participantIds[0]!, readAt);
    }
  }
}
