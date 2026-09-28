import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WholesaleOrder } from '@/modules/wholesale/entities/wholesale-order.entity';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

@Entity('wholesale_order_items')
export class WholesaleOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => WholesaleOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: WholesaleOrder;

  @Index()
  @Column({ type: 'uuid', name: 'product_variant_id' })
  productVariantId: string;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
