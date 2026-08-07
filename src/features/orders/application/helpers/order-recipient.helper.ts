import { OrderRecipient } from '../../core/domain/order.types.js';
import { OrderValidationError } from '../../core/errors/order.errors.js';

export class OrderRecipientHelper {
  static validate(recipient: OrderRecipient): void {
    if (!recipient) {
      throw new OrderValidationError('Order recipient is required');
    }
    if (!recipient.type || !['USER', 'BUSINESS'].includes(recipient.type)) {
      throw new OrderValidationError('Invalid order recipient type');
    }
    if (!recipient.id) {
      throw new OrderValidationError('Order recipient ID is required');
    }
  }

  static toDatabaseFields(recipient: OrderRecipient): {
    sellerUserId: string | null;
    sellerBusinessId: string | null;
  } {
    return {
      sellerUserId: recipient.type === 'USER' ? recipient.id : null,
      sellerBusinessId: recipient.type === 'BUSINESS' ? recipient.id : null,
    };
  }

  static fromDatabaseFields(
    sellerUserId: string | null,
    sellerBusinessId: string | null,
  ): OrderRecipient {
    if (sellerUserId && sellerBusinessId) {
      throw new OrderValidationError('Order cannot have both sellerUserId and sellerBusinessId');
    }
    if (sellerUserId) {
      return { type: 'USER', id: sellerUserId };
    }
    if (sellerBusinessId) {
      return { type: 'BUSINESS', id: sellerBusinessId };
    }
    throw new OrderValidationError('Order is missing a recipient');
  }
}
