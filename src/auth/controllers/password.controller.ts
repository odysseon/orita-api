import { Body, Controller, Inject, Post, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
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
import {
  Public,
  moduleToken,
  CurrentIdentity,
  type RequestIdentity,
} from '@odysseon/whoami-adapter-nestjs';
import type { PasswordMethods } from '@odysseon/whoami-core/password';
import {
  LoginPasswordDto,
  ReceiptTokenResponse,
  RequestPasswordResetDto,
  ResetPasswordDto,
  ChangePasswordDto,
  AddPasswordDto,
} from '../dto/index.js';
import { MailQueueService } from '../../mail/mail-queue.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@ApiTags('Password Authentication')
@Controller('auth')
export class PasswordAuthController {
  constructor(
    @Inject(moduleToken('password'))
    private readonly password: PasswordMethods,
    private readonly mailQueueService: MailQueueService,
    private readonly configService: ConfigService<AppConfig>,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Login with email + password' })
  @ApiBody({ type: LoginPasswordDto })
  @ApiOkResponse({ type: ReceiptTokenResponse })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginPassword(@Body() dto: LoginPasswordDto): Promise<ReceiptTokenResponse> {
    const { receipt } = await this.password.authenticateWithPassword({
      email: dto.email,
      password: dto.password,
    });
    return { token: receipt.token, expiresAt: receipt.expiresAt };
  }

  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiOkResponse({ description: 'Password reset email sent if account exists' })
  @Public()
  @Post('password/reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<{ message: string }> {
    const result = await this.password.requestPasswordReset({ email: dto.email });

    if (result) {
      const frontendUrl = this.configService.get('FRONTEND_URL') as string;
      const url = new URL('/auth/reset-password', frontendUrl);
      url.searchParams.set('token', result.plainTextToken);
      const resetLink = url.toString();

      await this.mailQueueService.enqueueMail({
        to: dto.email,
        subject: 'Reset Your Password',
        template: 'password-reset',
        context: {
          url: resetLink,
          email: dto.email,
        },
      });
    }

    return { message: 'If an account exists, a password reset link has been sent to your email.' };
  }

  @ApiOperation({ summary: 'Reset password using a token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ type: ReceiptTokenResponse, description: 'Password reset successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ReceiptTokenResponse> {
    const { receipt, accountId } = await this.password.verifyPasswordReset({ token: dto.token });

    await this.password.addPasswordToAccount({
      accountId,
      password: dto.newPassword,
    });

    return { token: receipt.token, expiresAt: receipt.expiresAt };
  }

  @ApiOperation({ summary: 'Change current password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid current password' })
  @ApiBearerAuth()
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentIdentity() identity: RequestIdentity,
  ): Promise<{ success: boolean }> {
    await this.password.changePassword({
      accountId: identity.accountId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });

    return { success: true };
  }

  @ApiOperation({ summary: 'Add/set a password for an account (OAuth users)' })
  @ApiBody({ type: AddPasswordDto })
  @ApiOkResponse({ description: 'Password added successfully' })
  @ApiBearerAuth()
  @Post('password/add')
  @HttpCode(HttpStatus.OK)
  async addPassword(
    @Body() dto: AddPasswordDto,
    @CurrentIdentity() identity: RequestIdentity,
  ): Promise<{ success: boolean }> {
    // Ensure account doesn't already have a password
    const existingPassword = await this.prisma.passwordHash.findUnique({
      where: { accountId: identity.accountId },
    });

    if (existingPassword) {
      throw new ConflictException('Account already has a password set. Use the change password endpoint instead.');
    }

    await this.password.addPasswordToAccount({
      accountId: identity.accountId,
      password: dto.password,
    });

    return { success: true };
  }
}
