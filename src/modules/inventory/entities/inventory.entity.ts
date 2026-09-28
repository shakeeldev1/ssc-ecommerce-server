import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';

@Entity('inventories')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'product_variant_id' })
  productVariantId: string;

  @OneToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @Column({ type: 'int', name: 'available_quantity', default: 0 })
  availableQuantity: number;

  @Column({ type: 'int', name: 'reserved_quantity', default: 0 })
  reservedQuantity: number;

  @Column({ type: 'int', name: 'damaged_quantity', default: 0 })
  damagedQuantity: number;

  /** Lifetime counters for reporting — not "currently held" stock. */
  @Column({ type: 'int', name: 'total_sold_quantity', default: 0 })
  totalSoldQuantity: number;

  @Column({ type: 'int', name: 'total_returned_quantity', default: 0 })
  totalReturnedQuantity: number;

  @Column({ type: 'int', name: 'low_stock_threshold', default: 5 })
  lowStockThreshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
