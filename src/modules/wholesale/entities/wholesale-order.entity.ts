import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
import { PaymentMethod } from '@/modules/orders/enums/payment-method.enum';
import { PaymentStatus } from '@/modules/orders/enums/payment-status.enum';
import { ShippingAddress } from '@/modules/orders/interfaces/shipping-address.interface';
import { TaxBreakdown } from '@/modules/tax/interfaces/tax-breakdown.interface';
import { WholesaleOrderItem } from '@/modules/wholesale/entities/wholesale-order-item.entity';
import { WholesaleOrderStatusHistory } from '@/modules/wholesale/entities/wholesale-order-status-history.entity';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

/**
 * Mirrors `Order` from the retail checkout (Phase 4) but kept as a separate
 * table: wholesale orders have no coupon/student-discount concepts and their
 * line prices come from the pricing engine (tiers/negotiated buyer prices)
 * rather than the variant's flat retail price. Both channels share the same
 * `InventoryService` — stock is one pool regardless of sales channel.
 */
@Entity('wholesale_orders')
export class WholesaleOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, name: 'order_number' })
  orderNumber: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, name: 'invoice_number' })
  invoiceNumber: string;

  @Index()
  @Column({ type: 'uuid', name: 'buyer_user_id' })
  buyerUserId: string;

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

  @OneToMany(() => WholesaleOrderItem, (item) => item.order)
  items: WholesaleOrderItem[];

  @OneToMany(() => WholesaleOrderStatusHistory, (history) => history.order)
  statusHistory: WholesaleOrderStatusHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
