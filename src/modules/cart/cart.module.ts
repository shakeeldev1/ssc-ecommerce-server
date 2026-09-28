import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from '@/modules/cart/cart.controller';
import { CartService } from '@/modules/cart/cart.service';
import { CartItem } from '@/modules/cart/entities/cart-item.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem, ProductVariant])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
