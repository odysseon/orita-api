import { IsString, IsOptional, IsNumber, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderSubject, OrderRecipient } from '../../core/domain/order.types.js';

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => OrderSubject)
  subject!: OrderSubject;

  @ValidateNested()
  @Type(() => OrderRecipient)
  recipient!: OrderRecipient;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  agreedPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
