import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommissionEntryStatus } from '@/modules/commission/enums/commission-entry-status.enum';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { CommissionScopeType } from '@/modules/commission/enums/commission-scope-type.enum';
import { CommissionType } from '@/modules/commission/enums/commission-type.enum';
import { CommissionRule } from '@/modules/commission/entities/commission-rule.entity';
import { User } from '@/modules/users/entities/user.entity';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

/**
 * One historical, immutable payout record produced by a rule for one order.
 * Snapshots the rule's terms at computation time so later edits to the rule
 * (or even the rule being deleted) never rewrite history.
 */
@Entity('commission_entries')
export class CommissionEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'rule_id' })
  ruleId: string;

  @ManyToOne(() => CommissionRule, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rule_id' })
  rule: CommissionRule;

  @Index()
  @Column({ type: 'uuid', name: 'beneficiary_user_id' })
  beneficiaryUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'beneficiary_user_id' })
  beneficiary: User;

  @Column({ type: 'enum', enum: CommissionChannel, name: 'order_channel' })
  orderChannel: CommissionChannel;

  /** References either `orders` or `wholesale_orders` depending on orderChannel — no single FK is possible across both. */
  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'varchar', length: 32, name: 'order_number' })
  orderNumber: string;

  @Column({ type: 'enum', enum: CommissionScopeType, name: 'scope_type' })
  scopeType: CommissionScopeType;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'base_amount',
    transformer: decimalTransformer,
  })
  baseAmount: number;

  @Column({ type: 'enum', enum: CommissionType })
  type: CommissionType;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  value: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'enum', enum: CommissionEntryStatus })
  status: CommissionEntryStatus;

  /**
   * Set only for entries auto-held during the return window (see
   * CommissionService.computeForOrder) — null for a manually on-hold rule
   * (never auto-releases) and for zeroed/reversed entries (nothing to
   * release). Lazily checked and flipped to EARNED on read, mirroring the
   * stock-reservation lazy-expiry pattern from Phase 3.
   */
  @Column({ type: 'timestamptz', name: 'hold_until', nullable: true })
  holdUntil: Date | null;

  /** Set once this (already-EARNED) entry has been folded into a generated settlement statement. */
  @Index()
  @Column({ type: 'uuid', name: 'settlement_statement_id', nullable: true })
  settlementStatementId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
