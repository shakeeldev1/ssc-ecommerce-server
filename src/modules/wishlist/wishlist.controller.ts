import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { AddWishlistItemDto } from '@/modules/wishlist/dto/add-wishlist-item.dto';
import { WishlistItem } from '@/modules/wishlist/entities/wishlist-item.entity';
import { WishlistService } from '@/modules/wishlist/wishlist.service';

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's wishlist" })
  list(@CurrentUser() user: AuthenticatedUser): Promise<WishlistItem[]> {
    return this.wishlistService.list(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the wishlist' })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddWishlistItemDto,
  ): Promise<WishlistItem> {
    return this.wishlistService.add(user.id, dto.productId);
  }

  @Delete('items/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a product from the wishlist' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ): Promise<void> {
    await this.wishlistService.remove(user.id, productId);
  }
}
