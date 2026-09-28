import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCouponDto } from '@/modules/coupons/dto/create-coupon.dto';

export class UpdateCouponDto extends PartialType(CreateCouponDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
