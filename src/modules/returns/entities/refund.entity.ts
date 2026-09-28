import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { ReturnRequest } from '@/modules/returns/entities/return-request.entity';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

/** Created only when an approved RETURN actually had money to give back (the order had been paid). */
@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'return_request_id' })
  returnRequestId: string;

  @ManyToOne(() => ReturnRequest, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'return_request_id' })
  returnRequest: ReturnRequest;

  @Column({ type: 'enum', enum: CommissionChannel, name: 'order_channel' })
  orderChannel: CommissionChannel;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
