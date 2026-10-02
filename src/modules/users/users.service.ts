import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { UserStatus } from '@/modules/users/enums/user-status.enum';
import { ListUsersQueryDto } from '@/modules/users/dto/list-users-query.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';

export interface CreateUserInput {
  email: string;
  phone?: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  isPasswordSet?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = this.usersRepository.create({ ...input, email });
    return this.usersRepository.save(user);
  }

  /** Hard-deletes a user (cascades to their profile/card). Used only to roll back a half-finished signup. */
  async removeById(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
    });
  }

  async setPassword(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(id, { passwordHash, isPasswordSet: true });
  }

  async list(query: ListUsersQueryDto): Promise<PaginatedResult<User>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const builder = this.usersRepository.createQueryBuilder('user');
    if (query.role) builder.andWhere('user.role = :role', { role: query.role });
    if (query.status) builder.andWhere('user.status = :status', { status: query.status });
    if (query.search?.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      builder.andWhere(
        "(LOWER(user.email) LIKE :search OR LOWER(user.full_name) LIKE :search OR LOWER(COALESCE(user.phone, '')) LIKE :search)",
        { search },
      );
    }
    const [items, total] = await builder
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  /** Admin: block / suspend / re-activate another account. */
  async setStatus(id: string, status: UserStatus, actor: AuthenticatedUser): Promise<User> {
    const user = await this.assertActionable(id, actor, 'change the status of');
    const previous = { status: user.status };
    await this.usersRepository.update(id, { status });

    await this.auditLogService.record({
      actorUserId: actor.id,
      action: 'user.status_updated',
      entityName: 'User',
      entityId: id,
      previousValue: previous,
      newValue: { status },
    });

    return this.findById(id);
  }

  /** Admin: permanently delete an account (cascades to its profile/card/orders snapshots are preserved). */
  async removeAsAdmin(id: string, actor: AuthenticatedUser): Promise<void> {
    const user = await this.assertActionable(id, actor, 'delete');

    await this.auditLogService.record({
      actorUserId: actor.id,
      action: 'user.deleted',
      entityName: 'User',
      entityId: id,
      previousValue: { email: user.email, role: user.role, status: user.status },
    });

    await this.usersRepository.delete(id);
  }

  /**
   * Guards admin actions on an account: the target must exist, must not be the
   * actor themselves, and must not be another super admin (super admins are
   * managed out-of-band so they can never lock each other out or be escalated).
   */
  private async assertActionable(
    id: string,
    actor: AuthenticatedUser,
    verb: string,
  ): Promise<User> {
    if (id === actor.id) {
      throw new ForbiddenException(`You cannot ${verb} your own account`);
    }
    const user = await this.findById(id);
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(`You cannot ${verb} a super admin account`);
    }
    return user;
  }
}
