import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { District } from '@/modules/directory/entities/district.entity';
import { Institution } from '@/modules/directory/entities/institution.entity';
import { Region } from '@/modules/directory/entities/region.entity';
import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';
import { Gender } from '@/modules/students/enums/gender.enum';
import { User } from '@/modules/users/entities/user.entity';

@Entity('student_profiles')
export class StudentProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, name: 'student_id_number' })
  studentIdNumber: string;

  @Column({ type: 'varchar', length: 500, name: 'photo_url', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'varchar', length: 255, name: 'photo_public_id', nullable: true })
  photoPublicId: string | null;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender | null;

  @Index()
  @Column({ type: 'uuid', name: 'institution_id', nullable: true })
  institutionId: string | null;

  @ManyToOne(() => Institution, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution | null;

  @Index()
  @Column({ type: 'uuid', name: 'district_id', nullable: true })
  districtId: string | null;

  @ManyToOne(() => District, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'district_id' })
  district: District | null;

  @Index()
  @Column({ type: 'uuid', name: 'region_id', nullable: true })
  regionId: string | null;

  @ManyToOne(() => Region, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'region_id' })
  region: Region | null;

  /**
   * Set once this profile has been synced from a verified card in the
   * external Student Smart Card system (studentsmartcardpk.com). Null for
   * students who only ever self-registered without activating a card.
   */
  @Column({ type: 'enum', enum: ExternalHolderType, name: 'external_holder_type', nullable: true })
  externalHolderType: ExternalHolderType | null;

  @Column({ type: 'varchar', length: 200, name: 'external_institution_name', nullable: true })
  externalInstitutionName: string | null;

  // Card details synced from the issuer, printed on the student card.
  // Always null for individual card holders.
  @Column({ type: 'varchar', length: 500, name: 'external_institution_logo_url', nullable: true })
  externalInstitutionLogoUrl: string | null;

  @Column({ type: 'varchar', length: 100, name: 'external_class_name', nullable: true })
  externalClassName: string | null;

  @Column({ type: 'varchar', length: 50, name: 'external_section_name', nullable: true })
  externalSectionName: string | null;

  /** The school's roll number (shown as "Roll No" on the card). */
  @Column({ type: 'varchar', length: 50, name: 'external_roll_number', nullable: true })
  externalRollNumber: string | null;

  @Column({ type: 'timestamptz', name: 'external_synced_at', nullable: true })
  externalSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
