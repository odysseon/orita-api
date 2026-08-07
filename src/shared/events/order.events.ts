/**
 * Emitted whenever an Order is created (newStatus = REQUESTED) or transitions to a new status.
 *
 * Consumers:
 *  - OrderStatusChangedPolicy  (NotificationsModule) – pushes in-app / push notifications
 *  - OrderConversationListener (MessagingModule)     – posts a system timeline message if a
 *    conversation is linked to the order
 */
export interface OrderStatusChangedEvent {
  orderId: string;
  /** The user who placed the order */
  buyerId: string;
  /** The individual seller, if applicable */
  sellerUserId: string | null;
  /** The business seller, if applicable */
  sellerBusinessId: string | null;
  /** null when the order is first created */
  oldStatus: string | null;
  newStatus: string;
  listingId: string | null;
  opportunityId: string | null;
  /** Present if the order already has a linked conversation */
  conversationId: string | null;
}
