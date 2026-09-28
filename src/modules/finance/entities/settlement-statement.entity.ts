import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SettlementStatus } from '@/modules/finance/enums/settlement-status.enum';
import { User } from '@/modules/users/entities/user.entity';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

/** A finalized statement of what one beneficiary earned over one period — generated once, entries locked to it so they can't be double-counted in a later statement. */
@Entity('settlement_statements')
export class SettlementStatement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'beneficiary_user_id' })
  beneficiaryUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'beneficiary_user_id' })
  beneficiary: User;

  @Column({ type: 'date', name: 'period_start' })
  periodStart: string;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'total_amount',
    transformer: decimalTransformer,
  })
  totalAmount: number;

  @Column({ type: 'int', name: 'entry_count' })
  entryCount: number;

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.GENERATED })
  status: SettlementStatus;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt: Date;
}
