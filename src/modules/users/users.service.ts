import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { UserStatus } from '@/modules/users/enums/user-status.enum';
import { ListUsersQueryDto } from '@/modules/users/dto/list-users-query.dto';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';

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
}
