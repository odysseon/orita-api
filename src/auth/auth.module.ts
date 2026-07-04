import { Module } from '@nestjs/common';
import { WhoamiModule } from '@odysseon/whoami-adapter-nestjs';
import { whoamiConfig } from './auth.config.js';
import { AccountsController } from './controllers/accounts.controller.js';
import { PasswordAuthController } from './controllers/password.controller.js';
import { MagicLinkController } from './controllers/magic-link.controller.js';
import { IdentityController } from './controllers/identity.controller.js';
import { RegisterAccountUseCase } from './use-cases/register-account.service.js';
import { GoogleAuthUseCase } from './use-cases/google-auth.use-case.js';
import { MailModule } from '../mail/mail.module.js';
import { UsersModule } from '../users/users.module.js';
import { GoogleAuthController } from './controllers/google-auth.controller.js';

import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [WhoamiModule.registerAsync(whoamiConfig), MailModule, UsersModule, PrismaModule],
  controllers: [
    AccountsController,
    PasswordAuthController,
    MagicLinkController,
    IdentityController,
    GoogleAuthController,
  ],
  providers: [RegisterAccountUseCase, GoogleAuthUseCase],
})
export class AuthModule {}
