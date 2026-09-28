import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { CommissionModule } from '@/modules/commission/commission.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { OrdersModule } from '@/modules/orders/orders.module';
import { Refund } from '@/modules/returns/entities/refund.entity';
import { ReturnRequest } from '@/modules/returns/entities/return-request.entity';
import { ReturnsController } from '@/modules/returns/returns.controller';
import { ReturnsService } from '@/modules/returns/returns.service';
import { WholesaleOrderItem } from '@/modules/wholesale/entities/wholesale-order-item.entity';
import { WholesaleModule } from '@/modules/wholesale/wholesale.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReturnRequest,
      Refund,
      OrderItem,
      WholesaleOrderItem,
      ProductVariant,
    ]),
    OrdersModule,
    WholesaleModule,
    InventoryModule,
    CommissionModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
