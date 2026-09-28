import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { ListAuditLogsQueryDto } from '@/modules/audit-log/dto/list-audit-logs-query.dto';
import { AuditLog } from '@/modules/audit-log/entities/audit-log.entity';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit-trail entries, filterable by entity/action/actor' })
  list(@Query() query: ListAuditLogsQueryDto): Promise<PaginatedResult<AuditLog>> {
    return this.auditLogService.list(query);
  }
}
