import { Body, Controller, Inject, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../configs/validation.js';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public, moduleToken } from '@odysseon/whoami-adapter-nestjs';
import type { MagicLinkMethods } from '@odysseon/whoami-core/magiclink';
import {
  RequestMagicLinkDto,
  AuthenticateMagicLinkDto,
  RequestMagicLinkResponseDto,
  ReceiptTokenResponse,
} from '../dto/index.js';
import { MailQueueService } from '../../mail/mail-queue.service.js';
import { SessionService } from '../use-cases/session.service.js';
import { Req } from '@nestjs/common';
import type { Request } from 'express';

@ApiTags('Magic Link Authentication')
@ApiBearerAuth()
@Controller('auth/magic-link')
export class MagicLinkController {
  constructor(
    @Inject(moduleToken('magiclink'))
    private readonly magicLink: MagicLinkMethods,
    private readonly mailQueueService: MailQueueService,
    private readonly configService: ConfigService<AppConfig>,
    private readonly sessionService: SessionService,
  ) {}

  @ApiOperation({ summary: 'Request a magic link for login' })
  @ApiBody({ type: RequestMagicLinkDto })
  @ApiOkResponse({ type: RequestMagicLinkResponseDto })
  @Public()
  @Post('request')
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(@Body() dto: RequestMagicLinkDto): Promise<RequestMagicLinkResponseDto> {
    const { plainTextToken, isNewAccount } = await this.magicLink.requestMagicLink({
      email: dto.email,
    });

    const frontendUrl = this.configService.get('FRONTEND_URL') as string;
    const magicLinkUrl = `${frontendUrl}/auth/magic-link/callback?token=${plainTextToken}`;

    await this.mailQueueService.enqueueMail({
      to: dto.email,
      subject: 'Your Magic Link to Login',
      template: 'magic-link',
      context: {
        url: magicLinkUrl,
        email: dto.email,
      },
    });

    return {
      isNewAccount,
      message: 'If an account exists, a magic link has been sent to your email.',
    };
  }

  @ApiOperation({ summary: 'Authenticate with a magic link token' })
  @ApiBody({ type: AuthenticateMagicLinkDto })
  @ApiOkResponse({ type: ReceiptTokenResponse })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired magic link' })
  @Public()
  @Post('authenticate')
  @HttpCode(HttpStatus.OK)
  async authenticate(
    @Body() dto: AuthenticateMagicLinkDto,
    @Req() req: Request,
  ): Promise<ReceiptTokenResponse & { refreshToken: string }> {
    const { accountId } = await this.magicLink.authenticateWithMagicLink({
      token: dto.token,
    });

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { accessToken, refreshToken, expiresAt } = await this.sessionService.createSession(
      accountId,
      userAgent,
      ipAddress,
    );

    return { token: accessToken, refreshToken, expiresAt };
  }
}
