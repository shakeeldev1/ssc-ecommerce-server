import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CouponType } from '@/modules/coupons/enums/coupon-type.enum';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  /** Percentage points (0-100) for PERCENTAGE, or a currency amount for FIXED. */
  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  value: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'min_order_amount',
    default: 0,
    transformer: decimalTransformer,
  })
  minOrderAmount: number;

  /** Caps the discount a PERCENTAGE coupon can grant; ignored for FIXED. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'max_discount_amount',
    nullable: true,
    transformer: decimalTransformer,
  })
  maxDiscountAmount: number | null;

  @Column({ type: 'boolean', name: 'student_only', default: false })
  studentOnly: boolean;

  @Column({ type: 'int', name: 'usage_limit', nullable: true })
  usageLimit: number | null;

  @Column({ type: 'int', name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ type: 'int', name: 'per_user_limit', nullable: true })
  perUserLimit: number | null;

  @Column({ type: 'timestamptz', name: 'starts_at', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
