import { Module } from '@nestjs/common';
import { RedisModule } from '../shared/redis/redis.module.js';
import { MediaModule } from '../features/media/media.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { UsersController } from './delivery/http/users.controller.js';
import { PublicUsersController } from './delivery/http/public-users.controller.js';
import { UsersService } from './use-cases/users.service.js';
import { PublicUsersService } from './use-cases/public-users.service.js';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository.js';
import { USER_REPOSITORY_TOKEN } from './core/ports/user.repository.interface.js';

@Module({
  imports: [RedisModule, MediaModule, StorageModule],
  controllers: [UsersController, PublicUsersController],
  providers: [
    UsersService,
    PublicUsersService,
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [UsersService, USER_REPOSITORY_TOKEN],
})
export class UsersModule {}
