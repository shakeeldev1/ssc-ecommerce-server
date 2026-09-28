import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { OrderStatusHistory } from '@/modules/orders/entities/order-status-history.entity';
import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
import { PaymentMethod } from '@/modules/orders/enums/payment-method.enum';
import { PaymentStatus } from '@/modules/orders/enums/payment-status.enum';
import { ShippingAddress } from '@/modules/orders/interfaces/shipping-address.interface';
import { TaxBreakdown } from '@/modules/tax/interfaces/tax-breakdown.interface';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, name: 'order_number' })
  orderNumber: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, name: 'invoice_number' })
  invoiceNumber: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentMethod, name: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    name: 'payment_status',
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'jsonb', name: 'shipping_address' })
  shippingAddress: ShippingAddress;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  subtotal: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'discount_amount',
    default: 0,
    transformer: decimalTransformer,
  })
  discountAmount: number;

  /** Automatic Smart Card discount, separate from any coupon discount. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'card_discount_amount',
    default: 0,
    transformer: decimalTransformer,
  })
  cardDiscountAmount: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'card_discount_percent',
    nullable: true,
    transformer: decimalTransformer,
  })
  cardDiscountPercent: number | null;

  /** 'student' | 'individual' — which card rate applied, if any. */
  @Column({ type: 'varchar', length: 16, name: 'card_holder_type', nullable: true })
  cardHolderType: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'shipping_amount',
    default: 0,
    transformer: decimalTransformer,
  })
  shippingAmount: number;

  /** GST + PST + WHT total, computed at checkout by TaxService (Phase 8). */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'tax_amount',
    default: 0,
    transformer: decimalTransformer,
  })
  taxAmount: number;

  /** Itemized GST/PST/WHT breakdown for the tax-ready invoice (§14). */
  @Column({ type: 'jsonb', name: 'tax_breakdown', nullable: true })
  taxBreakdown: TaxBreakdown | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'total_amount',
    transformer: decimalTransformer,
  })
  totalAmount: number;

  @Column({ type: 'varchar', length: 32, name: 'coupon_code', nullable: true })
  couponCode: string | null;

  /** An affiliate/referral code, matched against Phase 6's campaign-scoped commission rules. */
  @Column({ type: 'varchar', length: 64, name: 'campaign_code', nullable: true })
  campaignCode: string | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order)
  statusHistory: OrderStatusHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
