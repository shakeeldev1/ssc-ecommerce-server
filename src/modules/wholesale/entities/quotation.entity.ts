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
import { QuoteRequest } from '@/modules/wholesale/entities/quote-request.entity';
import { QuotationStatus } from '@/modules/wholesale/enums/quotation-status.enum';

const decimalTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === undefined || value === null ? value : parseFloat(value)),
};

@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'quote_request_id' })
  quoteRequestId: string;

  @ManyToOne(() => QuoteRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_request_id' })
  quoteRequest: QuoteRequest;

  @Column({ type: 'uuid', name: 'issued_by_user_id' })
  issuedByUserId: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'price_per_unit',
    transformer: decimalTransformer,
  })
  pricePerUnit: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'timestamptz', name: 'valid_until', nullable: true })
  validUntil: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'enum', enum: QuotationStatus, default: QuotationStatus.PENDING })
  status: QuotationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
