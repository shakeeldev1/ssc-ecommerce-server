import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { Product } from '@/modules/catalog/entities/product.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { Order } from '@/modules/orders/entities/order.entity';
import { ProductReview } from '@/modules/reviews/entities/product-review.entity';
import { ProductReviewsController } from '@/modules/reviews/product-reviews.controller';
import { ReviewsController } from '@/modules/reviews/reviews.controller';
import { ReviewsService } from '@/modules/reviews/reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductReview, Product, ProductVariant, Order, OrderItem]),
    AuditLogModule,
  ],
  controllers: [ProductReviewsController, ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
