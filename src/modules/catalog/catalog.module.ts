import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { MediaModule } from '@/modules/media/media.module';
import { VendorsModule } from '@/modules/vendors/vendors.module';
import { BrandsController } from '@/modules/catalog/brands.controller';
import { BrandsService } from '@/modules/catalog/brands.service';
import { CategoriesController } from '@/modules/catalog/categories.controller';
import { CategoriesService } from '@/modules/catalog/categories.service';
import { Brand } from '@/modules/catalog/entities/brand.entity';
import { Category } from '@/modules/catalog/entities/category.entity';
import { ProductImage } from '@/modules/catalog/entities/product-image.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { Product } from '@/modules/catalog/entities/product.entity';
import { ProductsController } from '@/modules/catalog/products.controller';
import { ProductsService } from '@/modules/catalog/products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Brand, Category, Product, ProductVariant, ProductImage]),
    InventoryModule,
    MediaModule,
    VendorsModule,
  ],
  controllers: [BrandsController, CategoriesController, ProductsController],
  providers: [BrandsService, CategoriesService, ProductsService],
  exports: [ProductsService],
})
export class CatalogModule {}
