import { describe, it, expect } from 'vitest';
import { OrderRecipientHelper } from './order-recipient.helper.js';

describe('OrderRecipientHelper', () => {
  describe('validate', () => {
    it('throws if type is invalid', () => {
      expect(() =>
        OrderRecipientHelper.validate({ type: 'INVALID' as any, id: '123' }),
      ).toThrow(Error);
    });

    it('throws if id is missing', () => {
      expect(() => OrderRecipientHelper.validate({ type: 'USER', id: '' })).toThrow(Error);
    });

    it('passes for valid USER recipient', () => {
      expect(() => OrderRecipientHelper.validate({ type: 'USER', id: 'user_123' })).not.toThrow();
    });

    it('passes for valid BUSINESS recipient', () => {
      expect(() => OrderRecipientHelper.validate({ type: 'BUSINESS', id: 'biz_123' })).not.toThrow();
    });
  });

  describe('toDatabaseFields', () => {
    it('returns sellerUserId for USER type', () => {
      const result = OrderRecipientHelper.toDatabaseFields({ type: 'USER', id: 'user_123' });
      expect(result).toEqual({
        sellerUserId: 'user_123',
        sellerBusinessId: null,
      });
    });

    it('returns sellerBusinessId for BUSINESS type', () => {
      const result = OrderRecipientHelper.toDatabaseFields({ type: 'BUSINESS', id: 'biz_123' });
      expect(result).toEqual({
        sellerUserId: null,
        sellerBusinessId: 'biz_123',
      });
    });
  });
});

