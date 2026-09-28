import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { ListAuditLogsQueryDto } from '@/modules/audit-log/dto/list-audit-logs-query.dto';
import { AuditLog } from '@/modules/audit-log/entities/audit-log.entity';

export interface RecordAuditLogInput {
  actorUserId: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    const entry = this.auditLogRepository.create({
      actorUserId: input.actorUserId,
      action: input.action,
      entityName: input.entityName,
      entityId: input.entityId ?? null,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      ipAddress: input.ipAddress ?? null,
    });
    await this.auditLogRepository.save(entry);
  }

  async list(query: ListAuditLogsQueryDto): Promise<PaginatedResult<AuditLog>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: FindOptionsWhere<AuditLog> = {};
    if (query.entityName) where.entityName = query.entityName;
    if (query.action) where.action = query.action;
    if (query.actorUserId) where.actorUserId = query.actorUserId;

    const [items, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
