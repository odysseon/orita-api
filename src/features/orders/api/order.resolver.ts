import { Resolver, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { StatefulAuthGuard } from '../../../auth/guards/stateful-auth.guard.js';
import { OrderService } from '../application/services/order.service.js';
import { OrderResponse } from './dto/order-response.dto.js';

@Resolver(() => OrderResponse)
@UseGuards(StatefulAuthGuard)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Query(() => OrderResponse)
  async order(@Args('id') id: string): Promise<OrderResponse> {
    const order = await this.orderService.getOrder(id);
    return OrderResponse.fromEntity(order);
  }

  // TODO: Implement mutations with proper GraphQL input types instead of REST DTOs
  // For MVP we just stub this out or use GraphQL specific decorators if needed.
  // The system relies on REST or WS for some features, but assuming standard Oríta uses GraphQL.
}
