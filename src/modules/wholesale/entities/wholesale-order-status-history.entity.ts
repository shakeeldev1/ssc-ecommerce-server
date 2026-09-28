import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
import { WholesaleOrder } from '@/modules/wholesale/entities/wholesale-order.entity';

@Entity('wholesale_order_status_history')
export class WholesaleOrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => WholesaleOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: WholesaleOrder;

  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
