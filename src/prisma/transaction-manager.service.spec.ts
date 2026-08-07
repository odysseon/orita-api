import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionManager } from './transaction-manager.service.js';
import { PrismaService } from './prisma.service.js';

describe('TransactionManager', () => {
  let transactionManager: TransactionManager;

  beforeEach(() => {
    transactionManager = new TransactionManager();
  });

  describe('execute', () => {
    it('creates a new transaction and runs the callback', async () => {
      const mockTx = { isTx: true };
      const mockPrisma = {
        $transaction: vi.fn().mockImplementation(async (cb) => {
          return cb(mockTx);
        }),
      } as unknown as PrismaService;

      const callback = vi.fn().mockImplementation(() => {
        const tx = transactionManager.getActiveTransaction();
        expect(tx).toBe(mockTx);
        return 'success';
      });

      const result = await transactionManager.execute(mockPrisma, callback);

      expect(result).toBe('success');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    it('reuses existing transaction if one is already active', async () => {
      const mockTx = { isTx: true };
      const mockPrisma = {
        $transaction: vi.fn().mockImplementation(async (cb) => {
          return cb(mockTx);
        }),
      } as unknown as PrismaService;

      const innerCallback = vi.fn().mockImplementation(() => {
        const tx = transactionManager.getActiveTransaction();
        expect(tx).toBe(mockTx);
        return 'inner success';
      });

      const outerCallback = vi.fn().mockImplementation(async () => {
        const tx = transactionManager.getActiveTransaction();
        expect(tx).toBe(mockTx);
        // Call execute again with the SAME instance
        return transactionManager.execute(mockPrisma, innerCallback);
      });

      const result = await transactionManager.execute(mockPrisma, outerCallback);

      expect(result).toBe('inner success');
      // $transaction should only be called once by the outer execution
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(innerCallback).toHaveBeenCalled();
      expect(outerCallback).toHaveBeenCalled();
    });

    it('returns undefined for getActiveTransaction outside of execution', () => {
      expect(transactionManager.getActiveTransaction()).toBeUndefined();
    });
  });
});
