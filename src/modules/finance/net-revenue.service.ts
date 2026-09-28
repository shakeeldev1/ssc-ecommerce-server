import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Not, Repository } from 'typeorm';
import { CommissionEntry } from '@/modules/commission/entities/commission-entry.entity';
import { CommissionEntryStatus } from '@/modules/commission/enums/commission-entry-status.enum';
import { NetRevenueQueryDto } from '@/modules/finance/dto/net-revenue-query.dto';
import { NetRevenueReport } from '@/modules/finance/interfaces/net-revenue-report.interface';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
import { Refund } from '@/modules/returns/entities/refund.entity';
import { WholesaleOrder } from '@/modules/wholesale/entities/wholesale-order.entity';

@Injectable()
export class NetRevenueService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(WholesaleOrder)
    private readonly wholesaleOrdersRepository: Repository<WholesaleOrder>,
    @InjectRepository(Refund)
    private readonly refundsRepository: Repository<Refund>,
    @InjectRepository(CommissionEntry)
    private readonly commissionEntriesRepository: Repository<CommissionEntry>,
  ) {}

  async generate(query: NetRevenueQueryDto): Promise<NetRevenueReport> {
    const periodEndExclusive = new Date(query.endDate);
    periodEndExclusive.setDate(periodEndExclusive.getDate() + 1);
    const range = Between(new Date(query.startDate), periodEndExclusive);

    const [retailOrders, wholesaleOrders, refunds, commissionEntries] = await Promise.all([
      this.ordersRepository.find({
        where: { createdAt: range, status: Not(OrderStatus.CANCELLED) },
      }),
      this.wholesaleOrdersRepository.find({
        where: { createdAt: range, status: Not(OrderStatus.CANCELLED) },
      }),
      this.refundsRepository.find({ where: { createdAt: range } }),
      this.commissionEntriesRepository.find({
        where: {
          createdAt: range,
          status: In([CommissionEntryStatus.EARNED, CommissionEntryStatus.HELD]),
        },
      }),
    ]);

    const grossRevenue =
      retailOrders.reduce((sum, order) => sum + order.totalAmount, 0) +
      wholesaleOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalRefunds = refunds.reduce((sum, refund) => sum + refund.amount, 0);
    const totalCommissions = commissionEntries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      periodStart: query.startDate,
      periodEnd: query.endDate,
      orderCount: retailOrders.length + wholesaleOrders.length,
      grossRevenue,
      totalRefunds,
      totalCommissions,
      netRevenue: grossRevenue - totalRefunds - totalCommissions,
    };
  }
}
