import { Module } from '@nestjs/common';
import { WhoamiModule } from '@odysseon/whoami-adapter-nestjs';
import { whoamiConfig } from './auth.config.js';
import { AccountsController } from './controllers/accounts.controller.js';
import { PasswordAuthController } from './controllers/password.controller.js';
import { MagicLinkController } from './controllers/magic-link.controller.js';
import { IdentityController } from './controllers/identity.controller.js';
import { SessionController } from './controllers/session.controller.js';
import { RegisterAccountUseCase } from './use-cases/register-account.service.js';
import { GoogleAuthUseCase } from './use-cases/google-auth.use-case.js';
import { MailModule } from '../mail/mail.module.js';
import { UsersModule } from '../users/users.module.js';
import { GoogleAuthController } from './controllers/google-auth.controller.js';

import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionService } from './use-cases/session.service.js';

@Module({
  imports: [
    WhoamiModule.registerAsync(whoamiConfig),
    MailModule,
    UsersModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('RECEIPT_SECRET'),
      }),
    }),
  ],
  controllers: [
    AccountsController,
    PasswordAuthController,
    MagicLinkController,
    IdentityController,
    GoogleAuthController,
    SessionController,
  ],
  providers: [RegisterAccountUseCase, GoogleAuthUseCase, SessionService],
  exports: [SessionService, JwtModule],
})
export class AuthModule {}
