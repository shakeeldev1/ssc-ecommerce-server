import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Brand } from '@/modules/catalog/entities/brand.entity';
import { Category } from '@/modules/catalog/entities/category.entity';
import { ProductImage } from '@/modules/catalog/entities/product-image.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 280 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Free-form key/value spec sheet (e.g. { "Material": "Cotton", "Weight": "200g" }). */
  @Column({ type: 'jsonb', nullable: true })
  specifications: Record<string, string> | null;

  @Index()
  @Column({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Index()
  @Column({ type: 'uuid', name: 'brand_id', nullable: true })
  brandId: string | null;

  @ManyToOne(() => Brand, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand | null;

  /** Null means an admin/platform-owned product; set means it belongs to that vendor's own catalogue. */
  @Index()
  @Column({ type: 'uuid', name: 'vendor_id', nullable: true })
  vendorId: string | null;

  @ManyToOne(() => Vendor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor | null;

  /** Whether this product is browsable in the student-discount storefront section. */
  @Index()
  @Column({ type: 'boolean', name: 'is_student_discount_eligible', default: false })
  isStudentDiscountEligible: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @OneToMany(() => ProductImage, (image) => image.product)
  images: ProductImage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
