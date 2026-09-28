import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { CreateReturnRequestDto } from '@/modules/returns/dto/create-return-request.dto';
import { DecideReturnRequestDto } from '@/modules/returns/dto/decide-return-request.dto';
import { Refund } from '@/modules/returns/entities/refund.entity';
import { ReturnRequest } from '@/modules/returns/entities/return-request.entity';
import { ReturnRequestStatus } from '@/modules/returns/enums/return-request-status.enum';
import { ReturnsService } from '@/modules/returns/returns.service';

@ApiTags('returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Request a return or exchange for a delivered order' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReturnRequestDto,
  ): Promise<ReturnRequest> {
    return this.returnsService.create(user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the current user's own return/exchange requests" })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<ReturnRequest[]> {
    return this.returnsService.listMine(user.id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiQuery({ name: 'status', enum: ReturnRequestStatus, required: false })
  @ApiOperation({ summary: 'List all return/exchange requests, optionally filtered by status' })
  listAll(@Query('status') status?: ReturnRequestStatus): Promise<ReturnRequest[]> {
    return this.returnsService.listAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one return/exchange request' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<ReturnRequest> {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.returnsService.findOrFail(id);
    }
    return this.returnsService.getForUser(user.id, id);
  }

  @Get(':id/refund')
  @ApiOperation({
    summary: 'Get the refund issued for a return, if any (404 if nothing was refunded)',
  })
  async getRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Refund> {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.returnsService.getRefundForRequest(id);
    }
    await this.returnsService.getForUser(user.id, id);
    return this.returnsService.getRefundForRequest(id);
  }

  @Patch(':id/decide')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject a return/exchange request' })
  decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DecideReturnRequestDto,
  ): Promise<ReturnRequest> {
    return this.returnsService.decide(id, user.id, dto);
  }
}
