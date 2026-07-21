import { Controller, Post, Body, Req, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { SessionService } from '../use-cases/session.service.js';
import type { Request } from 'express';
import { Public, CurrentIdentity } from '@odysseon/whoami-adapter-nestjs';
import type { RequestIdentity } from '@odysseon/whoami-adapter-nestjs';


class RefreshTokenDto {
  token!: string;
}

@ApiTags('Sessions')
@Controller('auth')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ description: 'Returns a new access and refresh token' })
  @Public() // Public because they don't have a valid access token yet
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshSession(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'] as string | undefined;
    const ipAddress = req.ip;

    const { accessToken, refreshToken, expiresAt } = await this.sessionService.refreshSession(
      dto.token,
      userAgent,
      ipAddress,
    );

    return { token: accessToken, refreshToken, expiresAt };
  }

  @ApiOperation({ summary: 'Logout from the current session' })
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentIdentity() identity: RequestIdentity,
    @Req() req: Request & { sessionId: string },
  ) {
    if (req.sessionId) {
      await this.sessionService.logoutDevice(req.sessionId, identity.accountId);
    }
    return { success: true };
  }

  @ApiOperation({ summary: 'Logout a specific device/session' })
  @ApiBearerAuth()
  @Post('logout-device/:sessionId')
  @HttpCode(HttpStatus.OK)
  async logoutDevice(
    @Param('sessionId') sessionId: string,
    @CurrentIdentity() identity: RequestIdentity,
  ) {
    await this.sessionService.logoutDevice(sessionId, identity.accountId);
    return { success: true };
  }

  @ApiOperation({ summary: 'Logout all devices (revokes all sessions globally)' })
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentIdentity() identity: RequestIdentity) {
    await this.sessionService.logoutAll(identity.accountId);
    return { success: true };
  }
}
