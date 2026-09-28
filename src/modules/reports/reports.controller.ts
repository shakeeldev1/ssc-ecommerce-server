import { Controller, Get, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ReportsService } from '@/modules/reports/reports.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('orders.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="orders.csv"')
  @ApiOperation({ summary: 'Export all orders as CSV' })
  orders(): Promise<string> {
    return this.reportsService.ordersCsv();
  }

  @Get('users.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="users.csv"')
  @ApiOperation({ summary: 'Export all users as CSV' })
  users(): Promise<string> {
    return this.reportsService.usersCsv();
  }

  @Get('vendors.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="vendors.csv"')
  @ApiOperation({ summary: 'Export all vendors as CSV' })
  vendors(): Promise<string> {
    return this.reportsService.vendorsCsv();
  }

  @Get('commission-entries.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="commission-entries.csv"')
  @ApiOperation({ summary: 'Export the commission ledger as CSV' })
  commissionEntries(): Promise<string> {
    return this.reportsService.commissionEntriesCsv();
  }

  @Get('settlements.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="settlements.csv"')
  @ApiOperation({ summary: 'Export settlement statements as CSV' })
  settlements(): Promise<string> {
    return this.reportsService.settlementsCsv();
  }

  @Get('low-stock.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="low-stock.csv"')
  @ApiOperation({ summary: 'Export the low-stock report as CSV' })
  lowStock(): Promise<string> {
    return this.reportsService.lowStockCsv();
  }
}
