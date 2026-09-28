import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '@/modules/catalog/entities/product.entity';
import { WishlistItem } from '@/modules/wishlist/entities/wishlist-item.entity';
import { WishlistController } from '@/modules/wishlist/wishlist.controller';
import { WishlistService } from '@/modules/wishlist/wishlist.service';

@Module({
  imports: [TypeOrmModule.forFeature([WishlistItem, Product])],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
