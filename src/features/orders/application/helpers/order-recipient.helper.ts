import { OrderRecipient } from '../../core/domain/order.types.js';

export class OrderRecipientHelper {
  static validate(recipient: OrderRecipient): void {
    if (!recipient) {
      throw new Error('Order recipient is required');
    }
    if (!recipient.type || !['USER', 'BUSINESS'].includes(recipient.type)) {
      throw new Error('Invalid order recipient type');
    }
    if (!recipient.id) {
      throw new Error('Order recipient ID is required');
    }
  }

  static toDatabaseFields(recipient: OrderRecipient): { sellerUserId: string | null; sellerBusinessId: string | null } {
    return {
      sellerUserId: recipient.type === 'USER' ? recipient.id : null,
      sellerBusinessId: recipient.type === 'BUSINESS' ? recipient.id : null,
    };
  }

  static fromDatabaseFields(sellerUserId: string | null, sellerBusinessId: string | null): OrderRecipient {
    if (sellerUserId && sellerBusinessId) {
      throw new Error('Order cannot have both sellerUserId and sellerBusinessId');
    }
    if (sellerUserId) {
      return { type: 'USER', id: sellerUserId };
    }
    if (sellerBusinessId) {
      return { type: 'BUSINESS', id: sellerBusinessId };
    }
    throw new Error('Order is missing a recipient');
  }
}
