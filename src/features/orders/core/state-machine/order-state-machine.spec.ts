import { describe, it, expect } from 'vitest';
import { OrderStateMachine } from './order-state-machine.js';
import { OrderStatus } from '../domain/order.types.js';

describe('OrderStateMachine', () => {
  describe('assertTransition', () => {
    it('allows SELLER to transition REQUESTED -> ACCEPTED', () => {
      expect(() =>
        OrderStateMachine.assertTransition(OrderStatus.REQUESTED, OrderStatus.ACCEPTED, 'SELLER'),
      ).not.toThrow();
    });

    it('allows SELLER to transition REQUESTED -> DECLINED', () => {
      expect(() =>
        OrderStateMachine.assertTransition(OrderStatus.REQUESTED, OrderStatus.DECLINED, 'SELLER'),
      ).not.toThrow();
    });

    it('allows BUYER to transition REQUESTED -> CANCELLED', () => {
      expect(() =>
        OrderStateMachine.assertTransition(OrderStatus.REQUESTED, OrderStatus.CANCELLED, 'BUYER'),
      ).not.toThrow();
    });

    it('prevents BUYER from transitioning REQUESTED -> ACCEPTED', () => {
      expect(() =>
        OrderStateMachine.assertTransition(OrderStatus.REQUESTED, OrderStatus.ACCEPTED, 'BUYER'),
      ).toThrow(Error);
    });

    it('allows SELLER to transition ACCEPTED -> FULFILLING', () => {
      expect(() =>
        OrderStateMachine.assertTransition(OrderStatus.ACCEPTED, OrderStatus.FULFILLING, 'SELLER'),
      ).not.toThrow();
    });

    it('allows BUYER to confirm completion COMPLETION_REQUESTED -> COMPLETED', () => {
      expect(() =>
        OrderStateMachine.assertTransition(
          OrderStatus.COMPLETION_REQUESTED,
          OrderStatus.COMPLETED,
          'BUYER',
        ),
      ).not.toThrow();
    });

    it('allows BUYER to dispute completion COMPLETION_REQUESTED -> ACCEPTED', () => {
      expect(() =>
        OrderStateMachine.assertTransition(
          OrderStatus.COMPLETION_REQUESTED,
          OrderStatus.ACCEPTED,
          'BUYER',
        ),
      ).not.toThrow();
    });

    it('prevents SELLER from confirming their own completion', () => {
      expect(() =>
        OrderStateMachine.assertTransition(
          OrderStatus.COMPLETION_REQUESTED,
          OrderStatus.COMPLETED,
          'SELLER',
        ),
      ).toThrow(Error);
    });
  });

  describe('getTimestampField', () => {
    it('returns correct timestamp field for COMPLETED', () => {
      expect(OrderStateMachine.getTimestampField(OrderStatus.COMPLETED)).toBe('completedAt');
    });

    it('returns correct timestamp field for FULFILLING', () => {
      expect(OrderStateMachine.getTimestampField(OrderStatus.FULFILLING)).toBe('fulfillingAt');
    });

    it('returns correct timestamp field for REQUESTED', () => {
      expect(OrderStateMachine.getTimestampField(OrderStatus.REQUESTED)).toBe('requestedAt');
    });
  });
});
