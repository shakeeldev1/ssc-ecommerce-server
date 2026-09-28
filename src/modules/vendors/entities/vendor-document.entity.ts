import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';
import { VendorDocumentType } from '@/modules/vendors/enums/vendor-document-type.enum';

@Entity('vendor_documents')
export class VendorDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'enum', enum: VendorDocumentType })
  type: VendorDocumentType;

  @Column({ type: 'varchar', length: 512 })
  url: string;

  @Column({ type: 'varchar', length: 255, name: 'public_id' })
  publicId: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
