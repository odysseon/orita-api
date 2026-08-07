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
        if (typeof prop === 'string' && prop === 'transactionManager') {
          return Reflect.get(target, prop, receiver);
        }

        const tx = target.transactionManager?.getActiveTransaction();

        if (typeof prop === 'string' && prop.startsWith('$')) {
          const globalMethods = ['$connect', '$disconnect', '$on', '$use', '$extends'];
          if (globalMethods.includes(prop)) {
            return Reflect.get(target, prop, receiver);
          }

          // Nested transactions are intentionally flattened into the ambient Unit of Work.
          // This is a deliberate architectural decision to ensure one UoW without savepoints.
          if (prop === '$transaction') {
            if (tx) {
              return async (arg1: unknown, arg2?: unknown) => {
                // If it's an array of Prisma promises, we must execute them on the tx.
                // However, standard nested transaction usually passes a callback.
                if (typeof arg1 === 'function') {
                  const callback = arg1 as (t: unknown) => Promise<unknown>;
                  return callback(tx);
                }
                // Fallback for safety
                const method = Reflect.get(target, prop, receiver) as (
                  this: unknown,
                  arg1: unknown,
                  arg2?: unknown,
                ) => unknown;
                return method.call(target, arg1, arg2);
              };
            }
            return Reflect.get(target, prop, receiver);
          }

          // Route raw queries to the active transaction
          if (tx && prop in tx) {
            return Reflect.get(tx, prop, tx) as unknown;
          }

          return Reflect.get(target, prop, receiver);
        }

        if (tx && typeof prop === 'string' && prop in tx) {
          return Reflect.get(tx, prop, tx) as unknown;
        }

        return Reflect.get(target, prop, receiver);
      },
    });
  }
}
