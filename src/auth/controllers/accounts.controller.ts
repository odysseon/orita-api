import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '@odysseon/whoami-adapter-nestjs';
import { RegisterDto, RegisterResponse } from '../dto/index.js';
import { RegisterAccountUseCase } from '../use-cases/register-account.service.js';

import { Throttle } from '@nestjs/throttler';

@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly registerUseCase: RegisterAccountUseCase) {}

  @ApiOperation({ summary: 'Register a new account' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ type: RegisterResponse })
  @ApiConflictResponse({ description: 'Email already registered' })
  @Public()
  @Throttle({ default: { limit: 10, ttl: 300000 } }) // 10 attempts per 5 minutes
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return await this.registerUseCase.execute(dto);
  }
}
