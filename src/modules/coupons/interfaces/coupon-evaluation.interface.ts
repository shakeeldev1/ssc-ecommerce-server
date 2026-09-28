import { Coupon } from '@/modules/coupons/entities/coupon.entity';

export interface CouponEvaluation {
  coupon: Coupon;
  discountAmount: number;
}
