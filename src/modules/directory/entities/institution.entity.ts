import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { District } from '@/modules/directory/entities/district.entity';
import { SchoolChain } from '@/modules/directory/entities/school-chain.entity';
import { InstitutionType } from '@/modules/directory/enums/institution-type.enum';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'enum', enum: InstitutionType })
  type: InstitutionType;

  @Index()
  @Column({ type: 'uuid', name: 'district_id' })
  districtId: string;

  @ManyToOne(() => District, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'district_id' })
  district: District;

  /** Null if this school doesn't belong to a chain — Phase 6 routes chain-tier commissions off this. */
  @Index()
  @Column({ type: 'uuid', name: 'school_chain_id', nullable: true })
  schoolChainId: string | null;

  @ManyToOne(() => SchoolChain, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'school_chain_id' })
  schoolChain: SchoolChain | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
