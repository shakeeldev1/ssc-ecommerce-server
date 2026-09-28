import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from '@/modules/inventory/entities/inventory.entity';
import { InventoryAdjustment } from '@/modules/inventory/entities/inventory-adjustment.entity';
import { StockReservation } from '@/modules/inventory/entities/stock-reservation.entity';
import { InventoryController } from '@/modules/inventory/inventory.controller';
import { InventoryService } from '@/modules/inventory/inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, InventoryAdjustment, StockReservation])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
