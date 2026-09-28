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
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { CommissionRuleStatus } from '@/modules/commission/enums/commission-rule-status.enum';
import { CommissionScopeType } from '@/modules/commission/enums/commission-scope-type.enum';
import { CommissionType } from '@/modules/commission/enums/commission-type.enum';
import { User } from '@/modules/users/entities/user.entity';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

@Entity('commission_rules')
export class CommissionRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index()
  @Column({ type: 'uuid', name: 'beneficiary_user_id' })
  beneficiaryUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'beneficiary_user_id' })
  beneficiary: User;

  @Column({ type: 'enum', enum: CommissionScopeType, name: 'scope_type' })
  scopeType: CommissionScopeType;

  /** A Region/District/Institution/SchoolChain id depending on scopeType; null for GLOBAL and CAMPAIGN. */
  @Index()
  @Column({ type: 'uuid', name: 'scope_id', nullable: true })
  scopeId: string | null;

  /** Only set (and only matched) when scopeType is CAMPAIGN — a referral/affiliate code entered at checkout. */
  @Index()
  @Column({ type: 'varchar', length: 64, name: 'campaign_code', nullable: true })
  campaignCode: string | null;

  /** Null means this rule applies to both retail and wholesale orders. */
  @Column({ type: 'enum', enum: CommissionChannel, nullable: true })
  channel: CommissionChannel | null;

  @Column({ type: 'enum', enum: CommissionType })
  type: CommissionType;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  value: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'min_amount',
    nullable: true,
    transformer: decimalTransformer,
  })
  minAmount: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'max_amount',
    nullable: true,
    transformer: decimalTransformer,
  })
  maxAmount: number | null;

  /** Tie-breaker when more than one rule matches the same scope — highest wins. */
  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'enum', enum: CommissionRuleStatus, default: CommissionRuleStatus.ACTIVE })
  status: CommissionRuleStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
