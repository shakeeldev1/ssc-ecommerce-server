import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionEntry } from '@/modules/commission/entities/commission-entry.entity';
import { SettlementStatement } from '@/modules/finance/entities/settlement-statement.entity';
import { Inventory } from '@/modules/inventory/entities/inventory.entity';
import { Order } from '@/modules/orders/entities/order.entity';
import { ReportsController } from '@/modules/reports/reports.controller';
import { ReportsService } from '@/modules/reports/reports.service';
import { User } from '@/modules/users/entities/user.entity';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      User,
      Vendor,
      CommissionEntry,
      SettlementStatement,
      Inventory,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
