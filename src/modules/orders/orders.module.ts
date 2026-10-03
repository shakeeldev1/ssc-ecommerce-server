import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardDiscountsModule } from '@/modules/card-discounts/card-discounts.module';
import { CartModule } from '@/modules/cart/cart.module';
import { CommissionModule } from '@/modules/commission/commission.module';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { Product } from '@/modules/catalog/entities/product.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { OrderStatusHistory } from '@/modules/orders/entities/order-status-history.entity';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrdersController } from '@/modules/orders/orders.controller';
import { OrdersService } from '@/modules/orders/orders.service';
import { TaxModule } from '@/modules/tax/tax.module';
import { VendorsModule } from '@/modules/vendors/vendors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory, Product, ProductVariant]),
    CartModule,
    CardDiscountsModule,
    CouponsModule,
    InventoryModule,
    CommissionModule,
    TaxModule,
    NotificationsModule,
    VendorsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
