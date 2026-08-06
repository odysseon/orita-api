import { OrderStatus, OrderActorRole, Order } from '../domain/order.types.js';

/**
 * Allowed transitions grouped by current status.
 * Inside each status, maps the ActorRole (BUYER or SELLER) to the list of statuses they are allowed to transition to.
 */
export const ALLOWED_TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<OrderActorRole, OrderStatus[]>>
> = {
  REQUESTED: {
    BUYER: ['CANCELLED'],
    SELLER: ['ACCEPTED', 'DECLINED'],
  },
  ACCEPTED: {
    BUYER: ['CANCELLED'],
    SELLER: ['FULFILLING', 'COMPLETION_REQUESTED', 'CANCELLED'],
  },
  FULFILLING: {
    BUYER: ['CANCELLED'],
    SELLER: ['COMPLETION_REQUESTED', 'CANCELLED'],
  },
  COMPLETION_REQUESTED: {
    BUYER: ['COMPLETED', 'ACCEPTED'], // ACCEPTED means disputing the completion
    SELLER: [],
  },
  COMPLETED: {},
  DECLINED: {},
  CANCELLED: {},
};

export class OrderStateMachine {
  /**
   * Validates if a transition is legal for the given actor role.
   * Throws an error if invalid.
   */
  static assertTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
    actorRole: OrderActorRole,
  ): void {
    if (currentStatus === newStatus) {
      throw new Error(`Order is already in status ${newStatus}`);
    }

    const roleTransitions = ALLOWED_TRANSITIONS[currentStatus];
    const allowedForRole = roleTransitions[actorRole] || [];

    if (!allowedForRole.includes(newStatus)) {
      throw new Error(
        `Transition from ${currentStatus} to ${newStatus} is not allowed for ${actorRole}`,
      );
    }
  }

  /**
   * Returns the timestamp field name corresponding to a status.
   */
  static getTimestampField(status: OrderStatus): keyof Order | null {
    switch (status) {
      case 'REQUESTED':
        return 'requestedAt';
      case 'ACCEPTED':
        return 'acceptedAt';
      case 'FULFILLING':
        return 'fulfillingAt';
      case 'COMPLETION_REQUESTED':
        return 'completionRequestedAt';
      case 'COMPLETED':
        return 'completedAt';
      case 'CANCELLED':
        return 'cancelledAt';
      case 'DECLINED':
        return 'declinedAt';
      default:
        return null;
    }
  }
}
