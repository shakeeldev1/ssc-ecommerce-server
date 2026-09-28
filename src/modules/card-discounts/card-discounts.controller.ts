import { Body, Controller, Get, Param, ParseEnumPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { CardDiscountsService } from '@/modules/card-discounts/card-discounts.service';
import { UpdateCardDiscountSettingDto } from '@/modules/card-discounts/dto/update-card-discount-setting.dto';
import { CardDiscountSetting } from '@/modules/card-discounts/entities/card-discount-setting.entity';
import { CardDiscountComputation } from '@/modules/card-discounts/interfaces/card-discount.interface';
import { CartService } from '@/modules/cart/cart.service';
import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('card-discounts')
@Controller('card-discounts')
export class CardDiscountsController {
  constructor(
    private readonly cardDiscountsService: CardDiscountsService,
    private readonly cartService: CartService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Current card-holder discount rates (student vs individual)' })
  list(): Promise<CardDiscountSetting[]> {
    return this.cardDiscountsService.list();
  }

  @ApiBearerAuth()
  @Get('me/preview')
  @ApiOperation({ summary: "Preview the automatic card discount on the current user's cart" })
  async previewForCart(@CurrentUser() user: AuthenticatedUser): Promise<CardDiscountComputation> {
    const cart = await this.cartService.getSummary(user.id);
    return this.cardDiscountsService.computeForUser(
      user.id,
      cart.items.map((item) => ({
        unitPrice: item.productVariant.price,
        quantity: item.quantity,
        isEligible: item.productVariant.product?.isStudentDiscountEligible ?? false,
      })),
    );
  }

  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @Put(':holderType')
  @ApiOperation({ summary: 'Set the card discount for school-linked students or individuals' })
  update(
    @Param('holderType', new ParseEnumPipe(ExternalHolderType)) holderType: ExternalHolderType,
    @Body() dto: UpdateCardDiscountSettingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CardDiscountSetting> {
    return this.cardDiscountsService.update(holderType, dto, user.id);
  }
}
