import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { NetRevenueQueryDto } from '@/modules/finance/dto/net-revenue-query.dto';
import { NetRevenueReport } from '@/modules/finance/interfaces/net-revenue-report.interface';
import { NetRevenueService } from '@/modules/finance/net-revenue.service';

@ApiTags('finance')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('finance/net-revenue')
export class NetRevenueController {
  constructor(private readonly netRevenueService: NetRevenueService) {}

  @Get()
  @ApiOperation({
    summary: 'Gross revenue minus refunds minus committed commissions, over a period',
  })
  generate(@Query() query: NetRevenueQueryDto): Promise<NetRevenueReport> {
    return this.netRevenueService.generate(query);
  }
}
