import { ConfigService } from '@nestjs/config';
import { WhoamiModuleAsyncOptions, WhoamiModuleOptions } from '@odysseon/whoami-adapter-nestjs';
import {
  JoseReceiptVerifier,
  JoseReceiptSigner,
  JoseReceiptConfig,
} from '@odysseon/whoami-adapter-jose';
import { PasswordModule } from '@odysseon/whoami-core/password';
import { MagicLinkModule } from '@odysseon/whoami-core/magiclink';
import { OAuthModule } from '@odysseon/whoami-core/oauth';
import { PrismaService } from '../prisma/prisma.service.js';
import { passwordConfig, joseConfig } from './password.config.js';
import { magicLinkConfig } from './magic-link.config.js';
import { oauthConfig } from './oauth.config.js';
import { createPrismaAdapters } from '@odysseon/whoami-adapter-prisma';

export const whoamiConfig: WhoamiModuleAsyncOptions = {
  inject: [ConfigService, PrismaService],
  useFactory: (...args: unknown[]): WhoamiModuleOptions => {
    const [configService, prismaService] = args as [ConfigService, PrismaService];
    const receiptSecret = configService.getOrThrow<string>('RECEIPT_SECRET');

    const joseConfigWithSecret: JoseReceiptConfig = {
      ...joseConfig,
      secret: receiptSecret,
    };
    const { accountRepo } = createPrismaAdapters(prismaService);

    const receiptVerifier = new JoseReceiptVerifier(joseConfigWithSecret);
    const receiptSigner = new JoseReceiptSigner(joseConfigWithSecret);

    const passConfig = passwordConfig(prismaService, receiptSigner);
    const mlConfig = magicLinkConfig(prismaService, receiptSigner);
    const oAuthConfig = oauthConfig(prismaService, receiptSigner);

    return {
      receiptVerifier,
      accountQuery: accountRepo,
      modules: [PasswordModule(passConfig), MagicLinkModule(mlConfig), OAuthModule(oAuthConfig)],
    };
  },
};
