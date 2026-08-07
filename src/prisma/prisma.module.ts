import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { TransactionManager } from './transaction-manager.service.js';

@Global()
@Module({
  providers: [TransactionManager, PrismaService],
  exports: [TransactionManager, PrismaService],
})
export class PrismaModule {}
