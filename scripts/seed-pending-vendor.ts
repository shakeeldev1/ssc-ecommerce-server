/**
 * Seeds one PENDING vendor (awaiting admin approval) to demonstrate the vendor
 * portal approval gate. Login: pendingvendor.test@ssc.local / Test@12345
 * Idempotent. Run: npx ts-node -r tsconfig-paths/register scripts/seed-pending-vendor.ts
 */
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '@/database/data-source';
import { User } from '@/modules/users/entities/user.entity';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { UserStatus } from '@/modules/users/enums/user-status.enum';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';
import { VendorStatus } from '@/modules/vendors/enums/vendor-status.enum';

async function main(): Promise<void> {
  await dataSource.initialize();
  const users = dataSource.getRepository(User);
  const vendors = dataSource.getRepository(Vendor);
  const email = 'pendingvendor.test@ssc.local';

  if (await users.findOne({ where: { email } })) {
    console.log(`• ${email} already exists — skipped.`);
    await dataSource.destroy();
    return;
  }

  const user = await users.save(
    users.create({
      email,
      phone: '+923111000099',
      passwordHash: await bcrypt.hash('Test@12345', 10),
      fullName: 'Pending Vendor',
      role: UserRole.VENDOR,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPasswordSet: true,
    }),
  );
  await vendors.save(
    vendors.create({
      userId: user.id,
      businessName: 'Awaiting Approval Traders',
      businessType: 'General',
      contactPhone: '+923111000099',
      bankAccountName: 'Awaiting Approval Traders',
      bankAccountNumber: 'PK00TEST0000000000000099',
      bankName: 'Test Bank',
      status: VendorStatus.PENDING,
    }),
  );
  console.log(`✓ created ${email} (role vendor, status PENDING) — password Test@12345`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
