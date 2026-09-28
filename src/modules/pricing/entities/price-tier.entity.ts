import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

/** A wholesale quantity price-break for one variant, e.g. "50+ units => 8.00/unit". */
@Entity('price_tiers')
@Index(['productVariantId', 'minQuantity'], { unique: true })
export class PriceTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'product_variant_id' })
  productVariantId: string;

  @Column({ type: 'int', name: 'min_quantity' })
  minQuantity: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'price_per_unit',
    transformer: decimalTransformer,
  })
  pricePerUnit: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
