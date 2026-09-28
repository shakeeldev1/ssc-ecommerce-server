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

/** A negotiated price for one specific wholesale buyer on one variant — overrides any price tier. */
@Entity('buyer_prices')
@Index(['productVariantId', 'buyerUserId'], { unique: true })
export class BuyerPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'product_variant_id' })
  productVariantId: string;

  @Index()
  @Column({ type: 'uuid', name: 'buyer_user_id' })
  buyerUserId: string;

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
