import { describe, it, expect } from 'vitest';
import { OrderSubjectHelper } from './order-subject.helper.js';

describe('OrderSubjectHelper', () => {
  describe('validate', () => {
    it('throws if type is invalid', () => {
      expect(() =>
        OrderSubjectHelper.validate({ type: 'INVALID' as any, id: '123' }),
      ).toThrow(Error);
    });

    it('throws if id is missing', () => {
      expect(() => OrderSubjectHelper.validate({ type: 'LISTING', id: '' })).toThrow(Error);
    });

    it('passes for valid LISTING subject', () => {
      expect(() => OrderSubjectHelper.validate({ type: 'LISTING', id: 'list_123' })).not.toThrow();
    });

    it('passes for valid OPPORTUNITY subject', () => {
      expect(() => OrderSubjectHelper.validate({ type: 'OPPORTUNITY', id: 'opp_123' })).not.toThrow();
    });
  });

  describe('toDatabaseFields', () => {
    it('returns listingId for LISTING type', () => {
      const result = OrderSubjectHelper.toDatabaseFields({ type: 'LISTING', id: 'list_123' });
      expect(result).toEqual({
        listingId: 'list_123',
        opportunityId: null,
      });
    });

    it('returns opportunityId for OPPORTUNITY type', () => {
      const result = OrderSubjectHelper.toDatabaseFields({ type: 'OPPORTUNITY', id: 'opp_123' });
      expect(result).toEqual({
        listingId: null,
        opportunityId: 'opp_123',
      });
    });
  });
});

