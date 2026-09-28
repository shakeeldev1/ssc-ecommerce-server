import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { CommissionModule } from '@/modules/commission/commission.module';
import { CommissionEntry } from '@/modules/commission/entities/commission-entry.entity';
import { SettlementStatement } from '@/modules/finance/entities/settlement-statement.entity';
import { NetRevenueController } from '@/modules/finance/net-revenue.controller';
import { NetRevenueService } from '@/modules/finance/net-revenue.service';
import { SettlementsController } from '@/modules/finance/settlements.controller';
import { SettlementsService } from '@/modules/finance/settlements.service';
import { Order } from '@/modules/orders/entities/order.entity';
import { Refund } from '@/modules/returns/entities/refund.entity';
import { WholesaleOrder } from '@/modules/wholesale/entities/wholesale-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SettlementStatement, CommissionEntry, Order, WholesaleOrder, Refund]),
    CommissionModule,
    AuditLogModule,
  ],
  controllers: [SettlementsController, NetRevenueController],
  providers: [SettlementsService, NetRevenueService],
})
export class FinanceModule {}
