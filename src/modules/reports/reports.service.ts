import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toCsv } from '@/common/utils/csv.util';
import { CommissionEntry } from '@/modules/commission/entities/commission-entry.entity';
import { SettlementStatement } from '@/modules/finance/entities/settlement-statement.entity';
import { Inventory } from '@/modules/inventory/entities/inventory.entity';
import { Order } from '@/modules/orders/entities/order.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Vendor) private readonly vendorsRepository: Repository<Vendor>,
    @InjectRepository(CommissionEntry)
    private readonly entriesRepository: Repository<CommissionEntry>,
    @InjectRepository(SettlementStatement)
    private readonly settlementsRepository: Repository<SettlementStatement>,
    @InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
  ) {}

  async ordersCsv(): Promise<string> {
    const orders = await this.ordersRepository.find({ order: { createdAt: 'DESC' } });
    return toCsv(orders, [
      { header: 'Order number', value: (o) => o.orderNumber },
      { header: 'Invoice number', value: (o) => o.invoiceNumber },
      { header: 'Customer', value: (o) => o.shippingAddress.fullName },
      { header: 'City', value: (o) => o.shippingAddress.city },
      { header: 'Status', value: (o) => o.status },
      { header: 'Payment method', value: (o) => o.paymentMethod },
      { header: 'Payment status', value: (o) => o.paymentStatus },
      { header: 'Subtotal', value: (o) => o.subtotal },
      { header: 'Discount', value: (o) => o.discountAmount },
      { header: 'Tax', value: (o) => o.taxAmount },
      { header: 'Total', value: (o) => o.totalAmount },
      { header: 'Placed at', value: (o) => o.createdAt.toISOString() },
    ]);
  }

  async usersCsv(): Promise<string> {
    const users = await this.usersRepository.find({ order: { createdAt: 'DESC' } });
    return toCsv(users, [
      { header: 'Full name', value: (u) => u.fullName },
      { header: 'Email', value: (u) => u.email },
      { header: 'Phone', value: (u) => u.phone },
      { header: 'Role', value: (u) => u.role },
      { header: 'Status', value: (u) => u.status },
      { header: 'Email verified', value: (u) => u.isEmailVerified },
      { header: 'Joined', value: (u) => u.createdAt.toISOString() },
    ]);
  }

  async vendorsCsv(): Promise<string> {
    const vendors = await this.vendorsRepository.find({ order: { createdAt: 'DESC' } });
    return toCsv(vendors, [
      { header: 'Business name', value: (v) => v.businessName },
      { header: 'Business type', value: (v) => v.businessType },
      { header: 'Contact phone', value: (v) => v.contactPhone },
      { header: 'Tax ID', value: (v) => v.taxId },
      { header: 'Bank', value: (v) => v.bankName },
      { header: 'Status', value: (v) => v.status },
      { header: 'Applied at', value: (v) => v.createdAt.toISOString() },
    ]);
  }

  async commissionEntriesCsv(): Promise<string> {
    const entries = await this.entriesRepository.find({
      relations: { beneficiary: true },
      order: { createdAt: 'DESC' },
    });
    return toCsv(entries, [
      { header: 'Order number', value: (e) => e.orderNumber },
      { header: 'Channel', value: (e) => e.orderChannel },
      { header: 'Scope', value: (e) => e.scopeType },
      { header: 'Beneficiary', value: (e) => e.beneficiary?.fullName ?? e.beneficiaryUserId },
      { header: 'Base amount', value: (e) => e.baseAmount },
      { header: 'Amount', value: (e) => e.amount },
      { header: 'Status', value: (e) => e.status },
      { header: 'Created at', value: (e) => e.createdAt.toISOString() },
    ]);
  }

  async settlementsCsv(): Promise<string> {
    const statements = await this.settlementsRepository.find({
      relations: { beneficiary: true },
      order: { generatedAt: 'DESC' },
    });
    return toCsv(statements, [
      { header: 'Beneficiary', value: (s) => s.beneficiary?.fullName ?? s.beneficiaryUserId },
      { header: 'Period start', value: (s) => s.periodStart },
      { header: 'Period end', value: (s) => s.periodEnd },
      { header: 'Entries', value: (s) => s.entryCount },
      { header: 'Total amount', value: (s) => s.totalAmount },
      { header: 'Status', value: (s) => s.status },
      { header: 'Generated at', value: (s) => s.generatedAt.toISOString() },
    ]);
  }

  async lowStockCsv(): Promise<string> {
    const inventories = await this.inventoryRepository.find({
      relations: { productVariant: { product: true } },
    });
    const lowStock = inventories.filter((inv) => inv.availableQuantity <= inv.lowStockThreshold);
    return toCsv(lowStock, [
      { header: 'Product', value: (i) => i.productVariant?.product?.name ?? '' },
      { header: 'SKU', value: (i) => i.productVariant?.sku ?? i.productVariantId },
      { header: 'Available', value: (i) => i.availableQuantity },
      { header: 'Reserved', value: (i) => i.reservedQuantity },
      { header: 'Damaged', value: (i) => i.damagedQuantity },
      { header: 'Threshold', value: (i) => i.lowStockThreshold },
    ]);
  }
}
