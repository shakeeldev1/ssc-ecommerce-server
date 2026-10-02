/**
 * Seeds one test user per dashboard into the configured database:
 *   - vendor.test@ssc.local       → Vendor dashboard (role vendor, approved)
 *   - student.test@ssc.local      → Customer dashboard w/ a school-linked card
 *   - individual.test@ssc.local   → Customer dashboard w/ an individual card
 *
 * All share the password: Test@12345
 *
 * Idempotent: skips any user whose email already exists. Run with:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-test-users.ts
 */
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import dataSource from '@/database/data-source';
import { User } from '@/modules/users/entities/user.entity';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { UserStatus } from '@/modules/users/enums/user-status.enum';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';
import { VendorStatus } from '@/modules/vendors/enums/vendor-status.enum';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';
import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';
import { Gender } from '@/modules/students/enums/gender.enum';
import { SmartCard } from '@/modules/smart-cards/entities/smart-card.entity';
import { SmartCardStatus } from '@/modules/smart-cards/enums/smart-card-status.enum';

const PASSWORD = 'Test@12345';
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  await dataSource.initialize();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();
  const expires = new Date(now.getTime() + YEAR_MS);

  const users = dataSource.getRepository(User);
  const vendors = dataSource.getRepository(Vendor);
  const profiles = dataSource.getRepository(StudentProfile);
  const cards = dataSource.getRepository(SmartCard);

  const ensureUser = async (
    email: string,
    fullName: string,
    role: UserRole,
    phone: string,
  ): Promise<User | null> => {
    const existing = await users.findOne({ where: { email } });
    if (existing) {
      console.log(`• ${email} already exists (role ${existing.role}) — skipped.`);
      return null;
    }
    const user = await users.save(
      users.create({
        email,
        phone,
        passwordHash,
        fullName,
        role,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: true,
        isPasswordSet: true,
      }),
    );
    console.log(`✓ created ${email} (role ${role})`);
    return user;
  };

  // 1) Vendor ----------------------------------------------------------------
  const vendorUser = await ensureUser(
    'vendor.test@ssc.local',
    'Test Vendor',
    UserRole.VENDOR,
    '+923111000001',
  );
  if (vendorUser) {
    await vendors.save(
      vendors.create({
        userId: vendorUser.id,
        businessName: 'Test Supplies Co.',
        businessType: 'Stationery & Books',
        taxId: 'NTN-TEST-0001',
        contactPhone: '+923111000001',
        bankAccountName: 'Test Supplies Co.',
        bankAccountNumber: 'PK00TEST0000000000000001',
        bankName: 'Test Bank',
        status: VendorStatus.APPROVED,
        approvedAt: now,
      }),
    );
    console.log('  ↳ vendor profile (approved) created');
  }

  // 2) School-linked student -------------------------------------------------
  const studentUser = await ensureUser(
    'student.test@ssc.local',
    'Ali Hassan',
    UserRole.STUDENT,
    '+923009876500',
  );
  if (studentUser) {
    const profile = await profiles.save(
      profiles.create({
        userId: studentUser.id,
        studentIdNumber: 'SSC-STU-0001',
        photoUrl: null,
        dateOfBirth: '2007-01-01',
        gender: Gender.MALE,
        externalHolderType: ExternalHolderType.STUDENT,
        externalInstitutionName: 'Demo High School',
        externalInstitutionLogoUrl: null,
        externalClassName: '10th Grade',
        externalSectionName: 'A',
        externalRollNumber: '1042',
        externalProductVariant: 5,
        externalCoverageAmount: 500_000,
        externalContactNumber: '+923009876500',
        externalEmail: 'student.test@ssc.local',
        externalFatherName: 'Muhammad Aslam',
        externalBFormNumber: '35202-7654321-9',
        externalCnicNumber: null,
        externalAddress: 'House 45, Block C, Model Town',
        externalCity: 'Lahore',
        externalGuardianName: 'Muhammad Aslam',
        externalGuardianRelationship: 'father',
        externalGuardianMobile: '+923009876543',
        externalNomineeName: null,
        externalNomineeRelationship: null,
        externalNomineeMobile: null,
        externalInstitutionAddress: 'Main Boulevard, Gulberg III',
        externalInstitutionCity: 'Lahore',
        externalInstitutionContact: '+924235710000',
        externalSyncedAt: now,
      }),
    );
    await cards.save(
      cards.create({
        studentProfileId: profile.id,
        cardNumber: 'CARD-TESTSTU1',
        qrToken: randomBytes(24).toString('hex'),
        status: SmartCardStatus.ACTIVE,
        issuedAt: now,
        expiresAt: expires,
      }),
    );
    console.log('  ↳ student profile + active school card (CARD-TESTSTU1) created');
  }

  // 3) Individual ------------------------------------------------------------
  const individualUser = await ensureUser(
    'individual.test@ssc.local',
    'Sana Malik',
    UserRole.STUDENT,
    '+923000000001',
  );
  if (individualUser) {
    const profile = await profiles.save(
      profiles.create({
        userId: individualUser.id,
        studentIdNumber: 'SSC-IND-0001',
        photoUrl: null,
        dateOfBirth: '1995-01-01',
        gender: Gender.FEMALE,
        externalHolderType: ExternalHolderType.INDIVIDUAL,
        externalInstitutionName: null,
        externalInstitutionLogoUrl: null,
        externalClassName: null,
        externalSectionName: null,
        externalRollNumber: null,
        externalProductVariant: 3,
        externalCoverageAmount: 300_000,
        externalContactNumber: '+923000000001',
        externalEmail: 'individual.test@ssc.local',
        externalFatherName: 'Abdul Rahman',
        externalBFormNumber: null,
        externalCnicNumber: '35202-1234567-1',
        externalAddress: 'House 12, Street 4, Gulberg',
        externalCity: 'Lahore',
        externalGuardianName: null,
        externalGuardianRelationship: null,
        externalGuardianMobile: null,
        externalNomineeName: 'Ayesha Khan',
        externalNomineeRelationship: 'spouse',
        externalNomineeMobile: '+923001234567',
        externalInstitutionAddress: null,
        externalInstitutionCity: null,
        externalInstitutionContact: null,
        externalSyncedAt: now,
      }),
    );
    await cards.save(
      cards.create({
        studentProfileId: profile.id,
        cardNumber: 'IND-CARD-TESTIND1',
        qrToken: randomBytes(24).toString('hex'),
        status: SmartCardStatus.ACTIVE,
        issuedAt: now,
        expiresAt: expires,
      }),
    );
    console.log('  ↳ individual profile + active individual card (IND-CARD-TESTIND1) created');
  }

  await dataSource.destroy();
  console.log('\nDone. Test login password for all three: ' + PASSWORD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
