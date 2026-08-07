import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { TransactionManager } from './transaction-manager.service.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
  constructor(
    @Inject(forwardRef(() => TransactionManager))
    private readonly transactionManager: TransactionManager,
  ) {
    const connectionString = process.env['DATABASE_URL'];
    const adapter = new PrismaPg({
      connectionString,
    });
    super({ adapter });

    return new Proxy(this, {
      get(target, prop, receiver) {
        // Exclude internal methods from proxying
        if (typeof prop === 'string' && (prop.startsWith('$') || prop === 'transactionManager')) {
          return Reflect.get(target, prop, receiver);
        }

        const tx = target.transactionManager?.getActiveTransaction();
        if (tx && prop in tx) {
          return Reflect.get(tx, prop, tx) as unknown;
        }

        return Reflect.get(target, prop, receiver);
      },
    });
  }
}
