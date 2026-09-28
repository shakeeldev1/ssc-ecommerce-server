import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UpsertBuyerPriceDto } from '@/modules/pricing/dto/upsert-buyer-price.dto';
import { UpsertPriceTierDto } from '@/modules/pricing/dto/upsert-price-tier.dto';
import { BuyerPrice } from '@/modules/pricing/entities/buyer-price.entity';
import { PriceTier } from '@/modules/pricing/entities/price-tier.entity';
import { PricingService } from '@/modules/pricing/pricing.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';

const PRICING_MANAGERS = [UserRole.SUPER_ADMIN, UserRole.VENDOR, UserRole.WHOLESALE_VENDOR];

@ApiTags('pricing')
@Controller('pricing/variants/:variantId')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Public()
  @Get('tiers')
  @ApiOperation({ summary: 'List the wholesale quantity price-breaks for a variant' })
  listTiers(@Param('variantId') variantId: string): Promise<PriceTier[]> {
    return this.pricingService.listTiers(variantId);
  }

  @Post('tiers')
  @Roles(...PRICING_MANAGERS)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or update a quantity price-break (same minQuantity updates it)',
  })
  upsertTier(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Body() dto: UpsertPriceTierDto,
  ): Promise<PriceTier> {
    return this.pricingService.upsertTier(variantId, dto, user);
  }

  @Delete('tiers/:tierId')
  @Roles(...PRICING_MANAGERS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a price tier' })
  async deleteTier(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Param('tierId') tierId: string,
  ): Promise<void> {
    await this.pricingService.deleteTier(variantId, tierId, user);
  }

  @Get('buyer-prices')
  @Roles(...PRICING_MANAGERS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List negotiated buyer-specific prices for a variant' })
  listBuyerPrices(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
  ): Promise<BuyerPrice[]> {
    return this.pricingService.listBuyerPrices(variantId, user);
  }

  @Post('buyer-prices')
  @Roles(...PRICING_MANAGERS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set (or update) a negotiated price for one buyer on this variant' })
  upsertBuyerPrice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Body() dto: UpsertBuyerPriceDto,
  ): Promise<BuyerPrice> {
    return this.pricingService.upsertBuyerPrice(variantId, dto, user);
  }
}
