import { IsEnum, IsString } from 'class-validator';
import { OrderStatus } from '../../core/domain/order.types.js';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsString()
  actorId!: string;
}
