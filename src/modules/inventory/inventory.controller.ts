import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { Inventory } from '@/modules/inventory/entities/inventory.entity';
import { InventoryAdjustment } from '@/modules/inventory/entities/inventory-adjustment.entity';
import { ManualAdjustmentDto } from '@/modules/inventory/dto/manual-adjustment.dto';
import { MarkDamagedDto } from '@/modules/inventory/dto/mark-damaged.dto';
import { RecordReturnDto } from '@/modules/inventory/dto/record-return.dto';
import { RestockDto } from '@/modules/inventory/dto/restock.dto';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('inventory')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('low-stock')
  @ApiOperation({ summary: 'List variants at or below their low-stock threshold' })
  listLowStock(): Promise<Inventory[]> {
    return this.inventoryService.listLowStock();
  }

  @Get('variants/:variantId')
  @ApiOperation({ summary: 'Get the current inventory snapshot for a variant' })
  getByVariant(@Param('variantId') variantId: string): Promise<Inventory> {
    return this.inventoryService.getByVariantId(variantId);
  }

  @Get('variants/:variantId/adjustments')
  @ApiOperation({ summary: 'List the adjustment history for a variant' })
  listAdjustments(@Param('variantId') variantId: string): Promise<InventoryAdjustment[]> {
    return this.inventoryService.listAdjustments(variantId);
  }

  @Post('variants/:variantId/restock')
  @ApiOperation({ summary: 'Add newly received stock' })
  restock(
    @Param('variantId') variantId: string,
    @Body() dto: RestockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Inventory> {
    return this.inventoryService.restock(variantId, dto.quantity, user.id, dto.reason);
  }

  @Post('variants/:variantId/damage')
  @ApiOperation({ summary: 'Move available stock to damaged' })
  markDamaged(
    @Param('variantId') variantId: string,
    @Body() dto: MarkDamagedDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Inventory> {
    return this.inventoryService.markDamaged(variantId, dto.quantity, user.id, dto.reason);
  }

  @Post('variants/:variantId/return')
  @ApiOperation({ summary: 'Record a returned item' })
  recordReturn(
    @Param('variantId') variantId: string,
    @Body() dto: RecordReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Inventory> {
    return this.inventoryService.recordReturn(
      variantId,
      dto.quantity,
      dto.restock,
      user.id,
      dto.reason,
    );
  }

  @Post('variants/:variantId/adjust')
  @ApiOperation({ summary: 'Apply a manual stock correction (e.g. after a physical stock-take)' })
  manualAdjustment(
    @Param('variantId') variantId: string,
    @Body() dto: ManualAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Inventory> {
    return this.inventoryService.manualAdjustment(
      variantId,
      dto.quantityChange,
      user.id,
      dto.reason,
    );
  }
}
