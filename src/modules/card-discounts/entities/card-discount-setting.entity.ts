import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';

const decimalTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === undefined || value === null ? value : parseFloat(value),
};

/**
 * Admin-managed automatic discount for verified Smart Card holders, one row
 * per holder type — school-linked students and individuals get separate
 * rates. Applied at checkout to products flagged isStudentDiscountEligible
 * ("card-discount eligible"), only while the holder's card is active.
 */
@Entity('card_discount_settings')
export class CardDiscountSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'enum', enum: ExternalHolderType, name: 'holder_type' })
  holderType: ExternalHolderType;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'discount_percent',
    default: 0,
    transformer: decimalTransformer,
  })
  discountPercent: number;

  /** Optional cap on the discount per order (PKR); null = no cap. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'max_discount_per_order',
    nullable: true,
    transformer: decimalTransformer,
  })
  maxDiscountPerOrder: number | null;

  @Column({ type: 'boolean', name: 'is_active', default: false })
  isActive: boolean;

  @Column({ type: 'uuid', name: 'updated_by_user_id', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
