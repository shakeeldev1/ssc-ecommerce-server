import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrderItemFulfillmentStatus } from '@/modules/orders/enums/order-item-fulfillment-status.enum';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Index()
  @Column({ type: 'uuid', name: 'product_variant_id' })
  productVariantId: string;

  /** Snapshots below freeze the product as it was at purchase time, independent of later catalog edits. */
  @Column({ type: 'varchar', length: 255, name: 'product_name' })
  productName: string;

  @Column({ type: 'varchar', length: 64, name: 'sku' })
  sku: string;

  @Column({ type: 'jsonb', name: 'variant_attributes', default: {} })
  variantAttributes: Record<string, string>;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'unit_price',
    transformer: decimalTransformer,
  })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'line_total',
    transformer: decimalTransformer,
  })
  lineTotal: number;

  /** The owning vendor's fulfillment progress for this line (pending → packed → shipped). */
  @Column({
    type: 'enum',
    enum: OrderItemFulfillmentStatus,
    name: 'fulfillment_status',
    default: OrderItemFulfillmentStatus.PENDING,
  })
  fulfillmentStatus: OrderItemFulfillmentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
