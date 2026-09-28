import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardDiscountsModule } from '@/modules/card-discounts/card-discounts.module';
import { CartModule } from '@/modules/cart/cart.module';
import { CommissionModule } from '@/modules/commission/commission.module';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { OrderStatusHistory } from '@/modules/orders/entities/order-status-history.entity';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrdersController } from '@/modules/orders/orders.controller';
import { OrdersService } from '@/modules/orders/orders.service';
import { TaxModule } from '@/modules/tax/tax.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory]),
    CartModule,
    CardDiscountsModule,
    CouponsModule,
    InventoryModule,
    CommissionModule,
    TaxModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
