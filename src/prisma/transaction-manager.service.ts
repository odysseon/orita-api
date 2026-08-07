import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient, Prisma } from '../../generated/prisma/client.js';

export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class TransactionManager {
  private readonly als = new AsyncLocalStorage<PrismaTransactionClient>();

  /**
   * Executes the given callback inside a Prisma transaction.
   * If a transaction is already active in the current context, it reuses it.
   */
  async execute<T>(
    prisma: PrismaClient,
    callback: () => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    const existingTx = this.als.getStore();
    if (existingTx) {
      // Already in a transaction, just execute the callback
      return callback();
    }

    return prisma.$transaction(async (tx) => {
      return this.als.run(tx, () => callback());
    }, options);
  }

  /**
   * Gets the active transaction client if one exists, otherwise undefined.
   */
  getActiveTransaction(): PrismaTransactionClient | undefined {
    return this.als.getStore();
  }
}
