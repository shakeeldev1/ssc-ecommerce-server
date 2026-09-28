import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardDiscountsModule } from '@/modules/card-discounts/card-discounts.module';
import { CartModule } from '@/modules/cart/cart.module';
import { CouponsController } from '@/modules/coupons/coupons.controller';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { CouponRedemption } from '@/modules/coupons/entities/coupon-redemption.entity';
import { Coupon } from '@/modules/coupons/entities/coupon.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, CouponRedemption]), CartModule, CardDiscountsModule],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
