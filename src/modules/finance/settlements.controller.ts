import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { GenerateSettlementDto } from '@/modules/finance/dto/generate-settlement.dto';
import { ListSettlementsQueryDto } from '@/modules/finance/dto/list-settlements-query.dto';
import { SettlementStatement } from '@/modules/finance/entities/settlement-statement.entity';
import { SettlementsService } from '@/modules/finance/settlements.service';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post('generate')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate a settlement statement for one beneficiary over a period' })
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateSettlementDto,
  ): Promise<SettlementStatement> {
    return this.settlementsService.generate(dto, user.id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all settlement statements, optionally filtered' })
  listAll(@Query() query: ListSettlementsQueryDto): Promise<SettlementStatement[]> {
    return this.settlementsService.listAll(query);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the current user's own settlement statements" })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<SettlementStatement[]> {
    return this.settlementsService.listMine(user.id);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get one settlement statement' })
  findOne(@Param('id') id: string): Promise<SettlementStatement> {
    return this.settlementsService.findOrFail(id);
  }

  @Patch(':id/mark-paid')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark a settlement statement as paid out' })
  markPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SettlementStatement> {
    return this.settlementsService.markPaid(id, user.id);
  }
}
