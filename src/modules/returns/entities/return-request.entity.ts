import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { ReturnRequestStatus } from '@/modules/returns/enums/return-request-status.enum';
import { ReturnRequestType } from '@/modules/returns/enums/return-request-type.enum';

/**
 * Scoped to the whole order for a RETURN (mirrors how OrdersService/
 * WholesaleOrdersService already restock every line on a RETURNED
 * transition) — an EXCHANGE instead targets one specific line (orderItemId)
 * and swaps it for replacementVariantId. No partial-quantity returns.
 */
@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CommissionChannel, name: 'order_channel' })
  orderChannel: CommissionChannel;

  /** References either `orders` or `wholesale_orders` depending on orderChannel — no single FK is possible across both. */
  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'varchar', length: 32, name: 'order_number' })
  orderNumber: string;

  @Index()
  @Column({ type: 'uuid', name: 'buyer_user_id' })
  buyerUserId: string;

  @Column({ type: 'enum', enum: ReturnRequestType })
  type: ReturnRequestType;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'boolean', default: true })
  restock: boolean;

  /** Required for EXCHANGE — the specific order line being swapped (from `order_items` or `wholesale_order_items`). */
  @Column({ type: 'uuid', name: 'order_item_id', nullable: true })
  orderItemId: string | null;

  /** Required for EXCHANGE — the variant the buyer wants instead. */
  @Column({ type: 'uuid', name: 'replacement_variant_id', nullable: true })
  replacementVariantId: string | null;

  @Column({ type: 'enum', enum: ReturnRequestStatus, default: ReturnRequestStatus.REQUESTED })
  status: ReturnRequestStatus;

  @Column({ type: 'text', name: 'decision_note', nullable: true })
  decisionNote: string | null;

  @Column({ type: 'uuid', name: 'decided_by_user_id', nullable: true })
  decidedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'decided_at', nullable: true })
  decidedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
