import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { Product } from '@/modules/catalog/entities/product.entity';
import { CommissionModule } from '@/modules/commission/commission.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { PricingModule } from '@/modules/pricing/pricing.module';
import { TaxModule } from '@/modules/tax/tax.module';
import { VendorsModule } from '@/modules/vendors/vendors.module';
import { QuoteRequest } from '@/modules/wholesale/entities/quote-request.entity';
import { Quotation } from '@/modules/wholesale/entities/quotation.entity';
import { WholesaleCartItem } from '@/modules/wholesale/entities/wholesale-cart-item.entity';
import { WholesaleOrderItem } from '@/modules/wholesale/entities/wholesale-order-item.entity';
import { WholesaleOrderStatusHistory } from '@/modules/wholesale/entities/wholesale-order-status-history.entity';
import { WholesaleOrder } from '@/modules/wholesale/entities/wholesale-order.entity';
import { WholesaleCartController } from '@/modules/wholesale/wholesale-cart.controller';
import { WholesaleCartService } from '@/modules/wholesale/wholesale-cart.service';
import { WholesaleCatalogueController } from '@/modules/wholesale/wholesale-catalogue.controller';
import { WholesaleCatalogueService } from '@/modules/wholesale/wholesale-catalogue.service';
import { WholesaleOrdersController } from '@/modules/wholesale/wholesale-orders.controller';
import { WholesaleOrdersService } from '@/modules/wholesale/wholesale-orders.service';
import { WholesaleQuotesController } from '@/modules/wholesale/wholesale-quotes.controller';
import { WholesaleQuotesService } from '@/modules/wholesale/wholesale-quotes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WholesaleCartItem,
      WholesaleOrder,
      WholesaleOrderItem,
      WholesaleOrderStatusHistory,
      QuoteRequest,
      Quotation,
      ProductVariant,
      Product,
    ]),
    InventoryModule,
    PricingModule,
    VendorsModule,
    CommissionModule,
    TaxModule,
  ],
  controllers: [
    WholesaleCatalogueController,
    WholesaleCartController,
    WholesaleOrdersController,
    WholesaleQuotesController,
  ],
  providers: [
    WholesaleCatalogueService,
    WholesaleCartService,
    WholesaleOrdersService,
    WholesaleQuotesService,
  ],
  exports: [WholesaleOrdersService],
})
export class WholesaleModule {}
