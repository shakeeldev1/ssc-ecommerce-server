import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { CardDiscountsService } from '@/modules/card-discounts/card-discounts.service';
import { CartService } from '@/modules/cart/cart.service';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { CreateCouponDto } from '@/modules/coupons/dto/create-coupon.dto';
import { UpdateCouponDto } from '@/modules/coupons/dto/update-coupon.dto';
import { ValidateCouponDto } from '@/modules/coupons/dto/validate-coupon.dto';
import { Coupon } from '@/modules/coupons/entities/coupon.entity';
import { CouponEvaluation } from '@/modules/coupons/interfaces/coupon-evaluation.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('coupons')
@ApiBearerAuth()
@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly cartService: CartService,
    private readonly cardDiscountsService: CardDiscountsService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all coupons' })
  list(): Promise<Coupon[]> {
    return this.couponsService.list();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a coupon' })
  create(@Body() dto: CreateCouponDto): Promise<Coupon> {
    return this.couponsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a coupon' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto): Promise<Coupon> {
    return this.couponsService.update(id, dto);
  }

  @Post('validate')
  @ApiOperation({ summary: "Preview a coupon's discount against the current user's cart" })
  async validate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValidateCouponDto,
  ): Promise<CouponEvaluation> {
    const cart = await this.cartService.getSummary(user.id);
    // Mirror checkout: the coupon applies after the automatic card discount.
    const cardDiscount = await this.cardDiscountsService.computeForUser(
      user.id,
      cart.items.map((item) => ({
        unitPrice: item.productVariant.price,
        quantity: item.quantity,
        isEligible: item.productVariant.product?.isStudentDiscountEligible ?? false,
      })),
    );
    return this.couponsService.evaluate(
      dto.code,
      user.id,
      Math.max(0, cart.subtotal - cardDiscount.discountAmount),
      // "Student-only" coupons need a real, active school-linked card —
      // individual card holders share the STUDENT role but aren't students.
      await this.cardDiscountsService.isVerifiedSchoolStudent(user.id),
    );
  }
}
