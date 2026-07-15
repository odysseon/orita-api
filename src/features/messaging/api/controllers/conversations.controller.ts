import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentIdentity, type RequestIdentity } from '@odysseon/whoami-adapter-nestjs';
import { PrismaService } from '../../../../prisma/prisma.service.js';

import {
  CreateConversationDto,
  SendMessageDto,
  UpdateConversationStatusDto,
  MarkMessagesReadDto,
  OpenConversationDto,
} from '../dto/request.dto.js';
import { ConversationResponseDto, MessageResponseDto } from '../dto/response.dto.js';

import { CreateConversationUseCase } from '../../application/use-cases/create-conversation.use-case.js';
import { GetConversationsUseCase } from '../../application/use-cases/get-conversations.use-case.js';
import { GetConversationDetailsUseCase } from '../../application/use-cases/get-conversation-details.use-case.js';
import { SendMessageUseCase } from '../../application/use-cases/send-message.use-case.js';
import { UpdateConversationStatusUseCase } from '../../application/use-cases/update-conversation-status.use-case.js';
import { MarkMessagesReadUseCase } from '../../application/use-cases/mark-messages-read.use-case.js';
import { OpenConversationUseCase } from '../../application/use-cases/open-conversation.use-case.js';
import { ParticipantService } from '../../application/services/participant.service.js';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createConversation: CreateConversationUseCase,
    private readonly getConversations: GetConversationsUseCase,
    private readonly getConversationDetails: GetConversationDetailsUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly updateStatus: UpdateConversationStatusUseCase,
    private readonly markMessagesRead: MarkMessagesReadUseCase,
    private readonly openConversationUseCase: OpenConversationUseCase,
    private readonly participantService: ParticipantService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  async create(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { accountId: identity.accountId },
    });
    const personalParticipant = await this.participantService.ensurePersonalParticipant(user.id);

    const conversation = await this.createConversation.execute({
      type: dto.type,
      participantId: personalParticipant.id, // Using personal participant as initiator by default
      invitedParticipantIds: dto.invitedParticipantIds,
      ...(dto.anchor ? { anchor: dto.anchor } : {}),
      ...(dto.initialMessage ? { initialMessage: dto.initialMessage } : {}),
    });
    return ConversationResponseDto.from(conversation);
  }

  @Post('open')
  @ApiOperation({ summary: 'Open or create a direct conversation with a target' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  async openConversation(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() dto: OpenConversationDto,
  ): Promise<ConversationResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { accountId: identity.accountId },
    });
    
    const conversation = await this.openConversationUseCase.execute({
      userId: user.id,
      targetType: dto.targetType,
      targetId: dto.targetId,
    });
    
    return ConversationResponseDto.from(conversation);
  }

  @Get()
  @ApiOperation({
    summary: 'List all conversations for the current user (including their businesses)',
  })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  async listAll(@CurrentIdentity() identity: RequestIdentity): Promise<ConversationResponseDto[]> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { accountId: identity.accountId },
    });
    const conversations = await this.getConversations.execute(user.id);
    return conversations.map((c) => ConversationResponseDto.from(c));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details and messages' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  async getDetails(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
  ): Promise<ConversationResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { accountId: identity.accountId },
    });
    const personalParticipant = await this.participantService.ensurePersonalParticipant(user.id);
    const details = await this.getConversationDetails.execute(id, personalParticipant.id);
    return ConversationResponseDto.from(details.conversation, details.messages);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  async send(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { accountId: identity.accountId },
    });
    // For simplicity, using personal participant.
    // Clients should eventually send the desired participantId to speak as a business.
    const personalParticipant = await this.participantService.ensurePersonalParticipant(user.id);

    const message = await this.sendMessage.execute({
      conversationId,
      participantId: personalParticipant.id,
      ...(dto.content ? { content: dto.content } : {}),
      ...(dto.mediaUrl ? { mediaUrl: dto.mediaUrl } : {}),
      ...(dto.mediaType ? { mediaType: dto.mediaType } : {}),
      ...(dto.embeds ? { embeds: dto.embeds } : {}),
    });
    return MessageResponseDto.from(message);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update conversation status' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  async setStatus(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ): Promise<ConversationResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { accountId: identity.accountId },
    });
    const personalParticipant = await this.participantService.ensurePersonalParticipant(user.id);
    const conversation = await this.updateStatus.execute(id, personalParticipant.id, dto.status);
    return ConversationResponseDto.from(conversation);
  }

  @Post(':id/read-receipts')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200 })
  async markRead(
    @CurrentIdentity() identity: RequestIdentity,
    @Param('id') conversationId: string,
    @Body() dto: MarkMessagesReadDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { accountId: identity.accountId },
    });
    const personalParticipant = await this.participantService.ensurePersonalParticipant(user.id);
    await this.markMessagesRead.execute({
      conversationId,
      messageIds: dto.messageIds,
      participantId: personalParticipant.id,
    });
  }
}
