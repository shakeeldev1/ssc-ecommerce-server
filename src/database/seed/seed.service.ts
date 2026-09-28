import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Configuration } from '@/config/configuration';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { UsersService } from '@/modules/users/users.service';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Bootstraps the very first Super Admin account from env vars, since
 * self-registration deliberately blocks the super_admin role (see
 * SELF_REGISTERABLE_ROLES) and Phase 9 (admin-managed staff accounts)
 * doesn't exist yet. No-ops if the env vars are unset or the account
 * already exists.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService<Configuration, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.configService.get('seed', { infer: true }).superAdminEmail;
    const password = this.configService.get('seed', { infer: true }).superAdminPassword;

    if (!email || !password) {
      return;
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({
      email,
      passwordHash,
      fullName: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
    });
    await this.usersService.markEmailVerified(user.id);

    this.logger.log(`Seeded initial Super Admin account: ${email}`);
  }
}
