import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { CheckoutWholesaleDto } from '@/modules/wholesale/dto/checkout-wholesale.dto';
import { ListWholesaleOrdersQueryDto } from '@/modules/wholesale/dto/list-wholesale-orders-query.dto';
import { UpdateWholesaleOrderStatusDto } from '@/modules/wholesale/dto/update-wholesale-order-status.dto';
import { WholesaleOrder } from '@/modules/wholesale/entities/wholesale-order.entity';
import { WholesaleOrdersService } from '@/modules/wholesale/wholesale-orders.service';

@ApiTags('wholesale')
@ApiBearerAuth()
@Controller('wholesale/orders')
export class WholesaleOrdersController {
  constructor(private readonly ordersService: WholesaleOrdersService) {}

  @Post()
  @Roles(UserRole.WHOLESALE_BUYER)
  @ApiOperation({ summary: "Checkout the current buyer's wholesale cart into an order" })
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutWholesaleDto,
  ): Promise<WholesaleOrder> {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get()
  @Roles(UserRole.WHOLESALE_BUYER)
  @ApiOperation({ summary: "List the current buyer's wholesale orders" })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListWholesaleOrdersQueryDto,
  ): Promise<PaginatedResult<WholesaleOrder>> {
    return this.ordersService.listMine(user.id, query);
  }

  @Get('admin')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all wholesale orders across every buyer' })
  listAll(@Query() query: ListWholesaleOrdersQueryDto): Promise<PaginatedResult<WholesaleOrder>> {
    return this.ordersService.listAll(query);
  }

  @Get(':id')
  @Roles(UserRole.WHOLESALE_BUYER)
  @ApiOperation({
    summary: 'Get one of the current wholesale order (with items and status history)',
  })
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<WholesaleOrder> {
    return this.ordersService.getForUser(user.id, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Move a wholesale order to a new status' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWholesaleOrderStatusDto,
  ): Promise<WholesaleOrder> {
    return this.ordersService.updateStatus(id, dto.status, user.id, dto.note);
  }
}
