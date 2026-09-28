import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { AddWholesaleCartItemDto } from '@/modules/wholesale/dto/add-wholesale-cart-item.dto';
import { UpdateWholesaleCartItemDto } from '@/modules/wholesale/dto/update-wholesale-cart-item.dto';
import { WholesaleCartSummary } from '@/modules/wholesale/interfaces/wholesale-cart-summary.interface';
import { WholesaleCartService } from '@/modules/wholesale/wholesale-cart.service';

@ApiTags('wholesale')
@ApiBearerAuth()
@Roles(UserRole.WHOLESALE_BUYER)
@Controller('wholesale/cart')
export class WholesaleCartController {
  constructor(private readonly cartService: WholesaleCartService) {}

  @Get()
  @ApiOperation({ summary: "Get the current buyer's wholesale cart, with resolved unit prices" })
  getCart(@CurrentUser() user: AuthenticatedUser): Promise<WholesaleCartSummary> {
    return this.cartService.getSummary(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a wholesale-eligible variant to the cart (enforces MOQ)' })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddWholesaleCartItemDto,
  ): Promise<WholesaleCartSummary> {
    return this.cartService.addItem(user.id, dto.productVariantId, dto.quantity);
  }

  @Patch('items/:variantId')
  @ApiOperation({ summary: 'Set the exact quantity of a wholesale cart line' })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateWholesaleCartItemDto,
  ): Promise<WholesaleCartSummary> {
    return this.cartService.updateItem(user.id, variantId, dto.quantity);
  }

  @Delete('items/:variantId')
  @ApiOperation({ summary: 'Remove a variant from the wholesale cart' })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
  ): Promise<WholesaleCartSummary> {
    return this.cartService.removeItem(user.id, variantId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Empty the wholesale cart' })
  async clear(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.cartService.clear(user.id);
  }
}
