import {
  Order as PrismaOrder,
  OrderStatus as PrismaOrderStatus,
} from '../../../../../generated/prisma/client.js';

export type OrderStatus = PrismaOrderStatus;
export const OrderStatus = PrismaOrderStatus;

export type Order = PrismaOrder;

export type OrderSubjectType = 'LISTING' | 'OPPORTUNITY';

export class OrderSubject {
  type!: OrderSubjectType;
  id!: string;
}

export type OrderRecipientType = 'USER' | 'BUSINESS';

export class OrderRecipient {
  type!: OrderRecipientType;
  id!: string;
}

export type OrderActorRole = 'BUYER' | 'SELLER';
