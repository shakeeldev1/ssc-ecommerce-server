import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCouponDto } from '@/modules/coupons/dto/create-coupon.dto';
import { UpdateCouponDto } from '@/modules/coupons/dto/update-coupon.dto';
import { CouponRedemption } from '@/modules/coupons/entities/coupon-redemption.entity';
import { Coupon } from '@/modules/coupons/entities/coupon.entity';
import { CouponType } from '@/modules/coupons/enums/coupon-type.enum';
import { CouponEvaluation } from '@/modules/coupons/interfaces/coupon-evaluation.interface';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponsRepository: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly redemptionsRepository: Repository<CouponRedemption>,
  ) {}

  async list(): Promise<Coupon[]> {
    return this.couponsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateCouponDto): Promise<Coupon> {
    this.assertSaneValue(dto.type, dto.value);

    const existing = await this.couponsRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException('A coupon with this code already exists');
    }

    return this.couponsRepository.save(
      this.couponsRepository.create({
        code: dto.code,
        type: dto.type,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount ?? 0,
        maxDiscountAmount: dto.maxDiscountAmount ?? null,
        studentOnly: dto.studentOnly ?? false,
        usageLimit: dto.usageLimit ?? null,
        perUserLimit: dto.perUserLimit ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      }),
    );
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOrFail(id);
    if (dto.type !== undefined || dto.value !== undefined) {
      this.assertSaneValue(dto.type ?? coupon.type, dto.value ?? coupon.value);
    }

    await this.couponsRepository.update(id, {
      type: dto.type,
      value: dto.value,
      minOrderAmount: dto.minOrderAmount,
      maxDiscountAmount: dto.maxDiscountAmount,
      studentOnly: dto.studentOnly,
      usageLimit: dto.usageLimit,
      perUserLimit: dto.perUserLimit,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      isActive: dto.isActive,
    });
    return this.findOrFail(id);
  }

  async findOrFail(id: string): Promise<Coupon> {
    const coupon = await this.couponsRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  /** Validates a coupon code against a cart and computes the resulting discount, without redeeming it. */
  async evaluate(
    code: string,
    userId: string,
    subtotal: number,
    isStudent: boolean,
  ): Promise<CouponEvaluation> {
    const coupon = await this.couponsRepository.findOne({ where: { code } });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid coupon code');
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('This coupon is not active yet');
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.studentOnly && !isStudent) {
      throw new BadRequestException('This coupon is only available to students');
    }
    if (subtotal < coupon.minOrderAmount) {
      throw new BadRequestException(
        `This coupon requires a minimum order of ${coupon.minOrderAmount}`,
      );
    }
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }
    if (coupon.perUserLimit !== null) {
      const usedByUser = await this.redemptionsRepository.count({
        where: { couponId: coupon.id, userId },
      });
      if (usedByUser >= coupon.perUserLimit) {
        throw new BadRequestException(
          'You have already used this coupon the maximum number of times',
        );
      }
    }

    let discountAmount =
      coupon.type === CouponType.PERCENTAGE ? (subtotal * coupon.value) / 100 : coupon.value;
    if (coupon.maxDiscountAmount !== null) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
    discountAmount = Math.min(discountAmount, subtotal);

    return { coupon, discountAmount };
  }

  /** Records a redemption and increments the coupon's usage count (called once an order is actually placed). */
  async redeem(couponId: string, userId: string, orderId: string): Promise<void> {
    await this.redemptionsRepository.save(
      this.redemptionsRepository.create({ couponId, userId, orderId }),
    );
    await this.couponsRepository.increment({ id: couponId }, 'usageCount', 1);
  }

  private assertSaneValue(type: CouponType, value: number): void {
    if (type === CouponType.PERCENTAGE && value > 100) {
      throw new BadRequestException('A percentage coupon value cannot exceed 100');
    }
  }
}
