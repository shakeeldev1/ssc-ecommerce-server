import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AdjustmentType } from '@/modules/inventory/enums/adjustment-type.enum';

@Entity('inventory_adjustments')
export class InventoryAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'inventory_id' })
  inventoryId: string;

  @Column({ type: 'enum', enum: AdjustmentType })
  type: AdjustmentType;

  /** Positive when stock increases (e.g. restock), negative when it decreases (e.g. damage). */
  @Column({ type: 'int', name: 'quantity_change' })
  quantityChange: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Index()
  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
