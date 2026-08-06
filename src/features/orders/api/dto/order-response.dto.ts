import { Field, ObjectType, Float } from '@nestjs/graphql';
import { OrderStatus, Order } from '../../core/domain/order.types.js';

@ObjectType()
export class OrderResponse {
  @Field()
  id!: string;

  @Field(() => String, { nullable: true })
  listingId?: string | null;

  @Field(() => String, { nullable: true })
  opportunityId?: string | null;

  @Field()
  buyerId!: string;

  @Field(() => String, { nullable: true })
  buyerBusinessId?: string | null;

  @Field(() => String, { nullable: true })
  sellerUserId?: string | null;

  @Field(() => String, { nullable: true })
  sellerBusinessId?: string | null;

  @Field(() => String, { nullable: true })
  conversationId?: string | null;

  @Field(() => Float)
  quantity!: number;

  @Field(() => Float, { nullable: true })
  agreedPrice?: number | null;

  @Field()
  currency!: string;

  @Field(() => Date, { nullable: true })
  scheduledFor?: Date | null;

  @Field(() => String, { nullable: true })
  note?: string | null;

  @Field(() => String)
  status!: OrderStatus;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  static fromEntity(order: Order): OrderResponse {
    return {
      ...order,
      quantity: Number(order.quantity),
      agreedPrice: order.agreedPrice ? Number(order.agreedPrice) : null,
      status: order.status,
    };
  }
}
