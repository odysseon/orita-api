import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from './order.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../../core/domain/order.types.js';

describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepository: any;
  let mockEventBus: any;

  beforeEach(() => {
    mockOrderRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };

    service = new OrderService(mockOrderRepository, mockEventBus);
  });

  describe('createOrder', () => {
    it('creates an order, defaults status to REQUESTED, and fires event', async () => {
      const mockCreatedOrder = {
        id: 'ord_123',
        buyerId: 'user_1',
        sellerUserId: 'user_2',
        status: OrderStatus.REQUESTED,
      };
      mockOrderRepository.create.mockResolvedValue(mockCreatedOrder);

      const result = await service.createOrder('user_1', {
        subject: { type: 'LISTING', id: 'list_1' },
        recipient: { type: 'USER', id: 'user_2' },
        quantity: 2,
      });

      expect(result).toEqual(mockCreatedOrder);
      expect(mockOrderRepository.create).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith('order.status.changed', expect.objectContaining({
        orderId: 'ord_123',
        newStatus: OrderStatus.REQUESTED,
      }));
    });
  });

  describe('transitionStatus', () => {
    it('throws NotFoundException if order does not exist', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);
      await expect(service.transitionStatus('user_1', 'ord_1', OrderStatus.ACCEPTED)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException if actor is neither buyer nor seller (simplified auth)', async () => {
      mockOrderRepository.findById.mockResolvedValue({
        id: 'ord_1',
        buyerId: 'user_1',
        sellerUserId: 'user_2',
        status: OrderStatus.REQUESTED,
      });

      // 'user_3' is not part of the order
      await expect(service.transitionStatus('user_3', 'ord_1', OrderStatus.ACCEPTED)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows SELLER to accept and fires event', async () => {
      mockOrderRepository.findById.mockResolvedValue({
        id: 'ord_1',
        buyerId: 'user_1',
        sellerUserId: 'user_2', // actor
        status: OrderStatus.REQUESTED,
      });
      mockOrderRepository.updateStatus.mockResolvedValue({
        id: 'ord_1',
        status: OrderStatus.ACCEPTED,
      });

      const result = await service.transitionStatus('user_2', 'ord_1', OrderStatus.ACCEPTED);
      expect(result.status).toBe(OrderStatus.ACCEPTED);
      expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
        'ord_1',
        OrderStatus.ACCEPTED,
        expect.objectContaining({
          acceptedAt: expect.any(Date),
        }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith('order.status.changed', expect.objectContaining({
        newStatus: OrderStatus.ACCEPTED,
      }));
    });
  });
});
