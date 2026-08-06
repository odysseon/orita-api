import { Module } from '@nestjs/common';
import { PrismaOrderRepository } from './infrastructure/prisma-order.repository.js';
import { OrderService } from './application/services/order.service.js';
import { OrderResolver } from './api/order.resolver.js';
import { AuthModule } from '../../auth/auth.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [
    {
      provide: 'IOrderRepository',
      useClass: PrismaOrderRepository,
    },
    OrderService,
    OrderResolver,
  ],
  exports: [OrderService],
})
export class OrdersModule {}
