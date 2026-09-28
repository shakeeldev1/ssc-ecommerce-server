import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { VendorDocument } from '@/modules/vendors/entities/vendor-document.entity';
import { VendorStatus } from '@/modules/vendors/enums/vendor-status.enum';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255, name: 'business_name' })
  businessName: string;

  @Column({ type: 'varchar', length: 100, name: 'business_type', nullable: true })
  businessType: string | null;

  @Column({ type: 'varchar', length: 64, name: 'tax_id', nullable: true })
  taxId: string | null;

  @Column({ type: 'varchar', length: 32, name: 'contact_phone' })
  contactPhone: string;

  @Column({ type: 'varchar', length: 255, name: 'bank_account_name' })
  bankAccountName: string;

  @Column({ type: 'varchar', length: 64, name: 'bank_account_number' })
  bankAccountNumber: string;

  @Column({ type: 'varchar', length: 100, name: 'bank_name' })
  bankName: string;

  @Column({ type: 'enum', enum: VendorStatus, default: VendorStatus.PENDING })
  status: VendorStatus;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamptz', name: 'approved_at', nullable: true })
  approvedAt: Date | null;

  @OneToMany(() => VendorDocument, (document) => document.vendor)
  documents: VendorDocument[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
