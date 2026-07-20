import { Injectable, Inject, ConflictException, Logger } from '@nestjs/common';
import { moduleToken } from '@odysseon/whoami-adapter-nestjs';
import type { PasswordMethods } from '@odysseon/whoami-core/password';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from '../dto/index.js';
import { MailQueueService } from '../../mail/mail-queue.service.js';
import { USER_REPOSITORY_TOKEN } from '../../users/core/ports/user.repository.interface.js';
import type { IUserRepository } from '../../users/core/ports/user.repository.interface.js';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../configs/validation.js';

@Injectable()
export class RegisterAccountUseCase {
  private readonly logger = new Logger(RegisterAccountUseCase.name);

  constructor(
    @Inject(moduleToken('password'))
    private readonly passwordAuth: PasswordMethods,
    private readonly prisma: PrismaService,
    private readonly mailQueueService: MailQueueService,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async execute(dto: RegisterDto) {
    // 1. Create Identity (Executes outside domain transaction)
    const { account } = await this.passwordAuth.registerWithPassword({
      email: dto.email,
      password: dto.password,
    });

    try {
      // 2. Create Domain User
      const user = await this.userRepository.create(account.id, dto.username);

      // Queue welcome email asynchronously
      await this.mailQueueService.enqueueMail({
        to: account.email,
        subject: 'Welcome to Orita!',
        template: 'welcome',
        context: {
          username: user.username,
          action_url: `${this.configService.get('FRONTEND_URL')}/login`,
        },
      });

      return {
        accountId: account.id,
        userId: user.id,
        email: account.email,
        username: user.username,
        createdAt: account.createdAt,
      };
    } catch (error: unknown) {
      // 3. COMPENSATING ROLLBACK
      this.logger.warn(`Registration failed for ${account.email}. Rolling back identity creation.`);

      await this.prisma.account
        .delete({ where: { id: account.id } })
        .catch((err) =>
          this.logger.error(`FATAL: Failed to rollback orphaned account ${account.id}`, err),
        );

      // check for Prisma unique constraint violation
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }
}
