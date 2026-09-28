import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { ListCommissionEntriesQueryDto } from '@/modules/commission/dto/list-commission-entries-query.dto';
import { CommissionEntry } from '@/modules/commission/entities/commission-entry.entity';
import { CommissionEntriesService } from '@/modules/commission/commission-entries.service';

@ApiTags('commission')
@ApiBearerAuth()
@Controller('commission/entries')
export class CommissionEntriesController {
  constructor(private readonly entriesService: CommissionEntriesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all commission entries (the historical payout ledger)' })
  listAll(
    @Query() query: ListCommissionEntriesQueryDto,
  ): Promise<PaginatedResult<CommissionEntry>> {
    return this.entriesService.listAll(query);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the current user's own earned commission entries" })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCommissionEntriesQueryDto,
  ): Promise<PaginatedResult<CommissionEntry>> {
    return this.entriesService.listMine(user.id, query);
  }
}
