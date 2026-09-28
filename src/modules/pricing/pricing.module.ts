import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { Product } from '@/modules/catalog/entities/product.entity';
import { BuyerPrice } from '@/modules/pricing/entities/buyer-price.entity';
import { PriceTier } from '@/modules/pricing/entities/price-tier.entity';
import { PricingController } from '@/modules/pricing/pricing.controller';
import { PricingService } from '@/modules/pricing/pricing.service';
import { VendorsModule } from '@/modules/vendors/vendors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceTier, BuyerPrice, ProductVariant, Product]),
    VendorsModule,
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
