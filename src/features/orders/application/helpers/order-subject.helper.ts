import { OrderSubject } from '../../core/domain/order.types.js';

export class OrderSubjectHelper {
  static validate(subject: OrderSubject): void {
    if (!subject) {
      throw new Error('Order subject is required');
    }
    if (!subject.type || !['LISTING', 'OPPORTUNITY'].includes(subject.type)) {
      throw new Error('Invalid order subject type');
    }
    if (!subject.id) {
      throw new Error('Order subject ID is required');
    }
  }

  static toDatabaseFields(subject: OrderSubject): { listingId: string | null; opportunityId: string | null } {
    return {
      listingId: subject.type === 'LISTING' ? subject.id : null,
      opportunityId: subject.type === 'OPPORTUNITY' ? subject.id : null,
    };
  }

  static fromDatabaseFields(listingId: string | null, opportunityId: string | null): OrderSubject {
    if (listingId && opportunityId) {
      throw new Error('Order cannot have both listingId and opportunityId');
    }
    if (listingId) {
      return { type: 'LISTING', id: listingId };
    }
    if (opportunityId) {
      return { type: 'OPPORTUNITY', id: opportunityId };
    }
    throw new Error('Order is missing a subject');
  }
}
