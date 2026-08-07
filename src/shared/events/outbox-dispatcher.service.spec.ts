import { Test, TestingModule } from '@nestjs/testing';
import { OutboxDispatcherService } from './outbox-dispatcher.service.js';
import { OutboxRepository } from './outbox.repository.js';
import { EVENT_PUBLISHER } from './event-publisher.interface.js';
import { Logger } from '@nestjs/common';

describe('OutboxDispatcherService', () => {
  let service: OutboxDispatcherService;
  let outboxRepository: OutboxRepository;
  let eventPublisher: any;

  const mockOutboxRepository = {
    leaseNextBatch: vi.fn(),
    markAsPublished: vi.fn(),
    releaseLeaseWithRetry: vi.fn(),
  };

  const mockEventPublisher = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxDispatcherService,
        {
          provide: OutboxRepository,
          useValue: mockOutboxRepository,
        },
        {
          provide: EVENT_PUBLISHER,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    service = module.get<OutboxDispatcherService>(OutboxDispatcherService);
    outboxRepository = module.get<OutboxRepository>(OutboxRepository);
    eventPublisher = module.get(EVENT_PUBLISHER);

    // Disable logger for tests to keep console clean
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('dispatchEvents', () => {
    it('should lease events, publish them, and mark as published', async () => {
      const mockEvents = [
        { id: 'evt-1', retryCount: 0 },
        { id: 'evt-2', retryCount: 1 },
      ];
      
      mockOutboxRepository.leaseNextBatch.mockResolvedValue(mockEvents);
      mockEventPublisher.publish.mockResolvedValue(undefined);

      await service.dispatchEvents();

      expect(mockOutboxRepository.leaseNextBatch).toHaveBeenCalledWith(100, 60000, expect.any(String));
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);
      expect(mockOutboxRepository.markAsPublished).toHaveBeenCalledTimes(2);
      expect(mockOutboxRepository.releaseLeaseWithRetry).not.toHaveBeenCalled();
    });

    it('should release lease with retry on publish failure', async () => {
      const mockEvents = [
        { id: 'evt-1', retryCount: 0 },
      ];
      
      mockOutboxRepository.leaseNextBatch.mockResolvedValue(mockEvents);
      // Simulate publisher failure
      mockEventPublisher.publish.mockRejectedValue(new Error('Publish Failed'));

      await service.dispatchEvents();

      expect(mockEventPublisher.publish).toHaveBeenCalled();
      expect(mockOutboxRepository.markAsPublished).not.toHaveBeenCalled();
      
      // Should release the lease and set backoff
      expect(mockOutboxRepository.releaseLeaseWithRetry).toHaveBeenCalledWith(
        'evt-1',
        expect.any(Date),
        expect.any(String),
        false, // Not yet a dead letter
      );
    });

    it('should dead-letter poison messages that exceed max retries', async () => {
      const mockEvents = [
        // Event has exceeded backoff array length (12)
        { id: 'evt-poison', retryCount: 15 },
      ];
      
      mockOutboxRepository.leaseNextBatch.mockResolvedValue(mockEvents);
      mockEventPublisher.publish.mockRejectedValue(new Error('Publish Failed'));

      await service.dispatchEvents();
      
      expect(mockOutboxRepository.releaseLeaseWithRetry).toHaveBeenCalledWith(
        'evt-poison',
        expect.any(Date),
        expect.any(String),
        true, // isDeadLetter should be true!
      );
    });
  });
});
