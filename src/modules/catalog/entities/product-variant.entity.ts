import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '@/modules/catalog/entities/product.entity';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  sku: string;

  /** e.g. { "color": "Red", "size": "M" } */
  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, string>;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  price: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'compare_at_price',
    nullable: true,
    transformer: decimalTransformer,
  })
  compareAtPrice: number | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  /** Whether wholesale buyers can RFQ/bulk-order this variant at all. */
  @Index()
  @Column({ type: 'boolean', name: 'is_wholesale_eligible', default: false })
  isWholesaleEligible: boolean;

  /** Minimum quantity for a wholesale line on this variant; null = no minimum. */
  @Column({ type: 'int', name: 'wholesale_moq', nullable: true })
  wholesaleMoq: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
