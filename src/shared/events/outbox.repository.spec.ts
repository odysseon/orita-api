import { Test, TestingModule } from '@nestjs/testing';
import { OutboxRepository } from './outbox.repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('OutboxRepository', () => {
  let repository: OutboxRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: vi.fn(),
    outboxEvent: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<OutboxRepository>(OutboxRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('leaseNextBatch', () => {
    it('should use atomic UPDATE with FOR UPDATE SKIP LOCKED to prevent concurrent processing', async () => {
      const mockEvents = [{ id: 'evt-1' }, { id: 'evt-2' }];
      mockPrismaService.$queryRaw.mockResolvedValue(mockEvents);

      const batchSize = 100;
      const leaseDurationMs = 60000;
      const dispatcherId = 'test-dispatcher-uuid';

      const result = await repository.leaseNextBatch(batchSize, leaseDurationMs, dispatcherId);

      expect(result).toEqual(mockEvents);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);

      // We can inspect the SQL string passed to $queryRaw to ensure it contains our atomic lease logic
      const callArgs = mockPrismaService.$queryRaw.mock.calls[0];
      const sqlString = callArgs[0].join('?'); // join the template literal strings

      expect(sqlString).toContain('UPDATE "outbox_events"');
      expect(sqlString).toContain('SET "leasedBy" = ?');
      expect(sqlString).toContain('FOR UPDATE SKIP LOCKED');
      expect(sqlString).toContain('RETURNING *');
    });
  });

  describe('markAsPublished', () => {
    it('should clear the lease when marking as published', async () => {
      await repository.markAsPublished('evt-1', 'test-dispatcher');

      expect(mockPrismaService.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'evt-1',
          leasedBy: 'test-dispatcher',
          publishedAt: null,
        },
        data: {
          publishedAt: expect.any(Date),
          leasedBy: null,
          leasedUntil: null,
        },
      });
    });
  });

  describe('releaseLeaseWithRetry', () => {
    it('should implement backoff, clear the lease, and handle dead-lettering', async () => {
      const nextAvailableAt = new Date();
      await repository.releaseLeaseWithRetry('evt-1', nextAvailableAt, 'test-dispatcher', true);

      expect(mockPrismaService.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'evt-1',
          leasedBy: 'test-dispatcher',
          publishedAt: null,
        },
        data: {
          failedAt: expect.any(Date),
          retryCount: { increment: 1 },
          availableAt: nextAvailableAt,
          leasedBy: null,
          leasedUntil: null,
          deadLetteredAt: expect.any(Date), // because isDeadLetter = true
        },
      });
    });
  });
});
