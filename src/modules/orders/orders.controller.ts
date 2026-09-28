import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { CheckoutDto } from '@/modules/orders/dto/checkout.dto';
import { ListOrdersQueryDto } from '@/modules/orders/dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrdersService } from '@/modules/orders/orders.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: "Checkout the current user's cart into an order" })
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutDto): Promise<Order> {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's orders" })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOrdersQueryDto,
  ): Promise<PaginatedResult<Order>> {
    return this.ordersService.listMine(user.id, query);
  }

  @Get('admin')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all orders across every user' })
  listAll(@Query() query: ListOrdersQueryDto): Promise<PaginatedResult<Order>> {
    return this.ordersService.listAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of the current order (with items and status history)' })
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Order> {
    return this.ordersService.getForUser(user.id, id);
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Get the invoice for one of the current order' })
  getInvoice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Order> {
    return this.ordersService.getForUser(user.id, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Move an order to a new status (order tracking)' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    return this.ordersService.updateStatus(id, dto.status, user.id, dto.note);
  }
}
