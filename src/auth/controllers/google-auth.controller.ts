import { Body, Controller, Post, Get, Delete, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  Public,
  moduleToken,
  CurrentIdentity,
  type RequestIdentity,
} from '@odysseon/whoami-adapter-nestjs';
import type { OAuthMethods } from '@odysseon/whoami-core/oauth';
import { AuthenticateGoogleDto, LinkGoogleDto } from '../dto/google-auth.dto.js';
import { ReceiptTokenResponse } from '../dto/receipt.dto.js';
import { GoogleAuthUseCase } from '../use-cases/google-auth.use-case.js';

@ApiTags('Google Authentication')
@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    private readonly googleAuthUseCase: GoogleAuthUseCase,
    @Inject(moduleToken('oauth'))
    private readonly oauth: OAuthMethods,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Get Google Client ID' })
  @ApiOkResponse({ description: 'Returns the Google Client ID' })
  @Public()
  @Get('client-id')
  getClientId(): { clientId: string } {
    // We get this safely from the environment; since it's a public client ID, 
    // exposing it to the frontend via API is perfectly safe.
    const clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    return { clientId };
  }

  @ApiOperation({ summary: 'Authenticate using a Google ID token' })
  @ApiBody({ type: AuthenticateGoogleDto })
  @ApiOkResponse({ type: ReceiptTokenResponse })
  @ApiUnauthorizedResponse({ description: 'Invalid Google ID token' })
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async authenticate(@Body() dto: AuthenticateGoogleDto): Promise<ReceiptTokenResponse> {
    return this.googleAuthUseCase.execute(dto.idToken);
  }

  @ApiOperation({ summary: 'Link Google account to current user' })
  @ApiBody({ type: LinkGoogleDto })
  @ApiOkResponse({ description: 'Google account linked successfully' })
  @ApiBearerAuth()
  @Post('link')
  @HttpCode(HttpStatus.OK)
  async link(
    @Body() dto: LinkGoogleDto,
    @CurrentIdentity() identity: RequestIdentity,
  ): Promise<{ success: boolean }> {
    await this.googleAuthUseCase.link(dto.idToken, identity.accountId);
    return { success: true };
  }

  @ApiOperation({ summary: 'Unlink Google account from current user' })
  @ApiOkResponse({ description: 'Google account unlinked successfully' })
  @ApiBearerAuth()
  @Delete('unlink')
  @HttpCode(HttpStatus.OK)
  async unlink(@CurrentIdentity() identity: RequestIdentity): Promise<{ success: boolean }> {
    await this.oauth.unlinkProvider(identity.accountId, 'google');
    return { success: true };
  }
}
