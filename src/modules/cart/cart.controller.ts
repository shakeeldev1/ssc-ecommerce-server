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
import { CartService } from '@/modules/cart/cart.service';
import { AddCartItemDto } from '@/modules/cart/dto/add-cart-item.dto';
import { UpdateCartItemDto } from '@/modules/cart/dto/update-cart-item.dto';
import { CartSummary } from '@/modules/cart/interfaces/cart-summary.interface';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's cart" })
  getCart(@CurrentUser() user: AuthenticatedUser): Promise<CartSummary> {
    return this.cartService.getSummary(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a variant to the cart (or increase its quantity)' })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCartItemDto,
  ): Promise<CartSummary> {
    return this.cartService.addItem(user.id, dto.productVariantId, dto.quantity);
  }

  @Patch('items/:variantId')
  @ApiOperation({ summary: 'Set the exact quantity of a cart line' })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartSummary> {
    return this.cartService.updateItem(user.id, variantId, dto.quantity);
  }

  @Delete('items/:variantId')
  @ApiOperation({ summary: 'Remove a variant from the cart' })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
  ): Promise<CartSummary> {
    return this.cartService.removeItem(user.id, variantId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Empty the cart' })
  async clear(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.cartService.clear(user.id);
  }
}
