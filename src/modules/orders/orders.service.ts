import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { Product } from '@/modules/catalog/entities/product.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { ProductApprovalStatus } from '@/modules/catalog/enums/product-approval-status.enum';
import { VendorAnalytics } from '@/modules/orders/interfaces/vendor-analytics.interface';
import { CardDiscountsService } from '@/modules/card-discounts/card-discounts.service';
import { CartService } from '@/modules/cart/cart.service';
import { CommissionService } from '@/modules/commission/commission.service';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { CheckoutDto } from '@/modules/orders/dto/checkout.dto';
import { ListOrdersQueryDto } from '@/modules/orders/dto/list-orders-query.dto';
import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { OrderStatusHistory } from '@/modules/orders/entities/order-status-history.entity';
import { Order } from '@/modules/orders/entities/order.entity';
import {
  ALLOWED_STATUS_TRANSITIONS,
  CANCELLABLE_STATUSES,
  OrderStatus,
} from '@/modules/orders/enums/order-status.enum';
import { PaymentMethod } from '@/modules/orders/enums/payment-method.enum';
import { PaymentStatus } from '@/modules/orders/enums/payment-status.enum';
import { generateOrderNumber } from '@/modules/orders/utils/generate-order-number.util';
import {
  FULFILLMENT_RANK,
  OrderItemFulfillmentStatus,
} from '@/modules/orders/enums/order-item-fulfillment-status.enum';
import { VendorOrderView } from '@/modules/orders/interfaces/vendor-order-view.interface';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { TaxService } from '@/modules/tax/tax.service';
import { VendorsService } from '@/modules/vendors/vendors.service';

const ORDER_RELATIONS = { items: true, statusHistory: true };

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

interface ConsumedLine {
  productVariantId: string;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private readonly statusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    private readonly vendorsService: VendorsService,
    private readonly cartService: CartService,
    private readonly inventoryService: InventoryService,
    private readonly couponsService: CouponsService,
    private readonly cardDiscountsService: CardDiscountsService,
    private readonly commissionService: CommissionService,
    private readonly taxService: TaxService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto): Promise<Order> {
    const cart = await this.cartService.getSummary(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // Automatic Smart Card discount (admin-set rate per holder type:
    // school-linked student vs individual) on card-discount-eligible lines.
    const cardDiscount = await this.cardDiscountsService.computeForUser(
      userId,
      cart.items.map((item) => ({
        unitPrice: item.productVariant.price,
        quantity: item.quantity,
        isEligible: item.productVariant.product?.isStudentDiscountEligible ?? false,
      })),
    );
    const cardDiscountAmount = cardDiscount.discountAmount;
    const isStudent = await this.cardDiscountsService.isVerifiedSchoolStudent(userId);

    let discountAmount = 0;
    let appliedCouponId: string | null = null;
    if (dto.couponCode) {
      const evaluation = await this.couponsService.evaluate(
        dto.couponCode,
        userId,
        // Coupons apply to what's left after the card discount.
        Math.max(0, cart.subtotal - cardDiscountAmount),
        isStudent,
      );
      discountAmount = evaluation.discountAmount;
      appliedCouponId = evaluation.coupon.id;
    }

    const shippingAmount = 0;
    const taxableAmount = Math.max(0, cart.subtotal - cardDiscountAmount - discountAmount);
    const taxBreakdown = this.taxService.computeTax(taxableAmount);
    const taxAmount = taxBreakdown.totalTax;
    const totalAmount = Math.max(0, taxableAmount + shippingAmount + taxAmount);

    const consumed: ConsumedLine[] = [];
    try {
      for (const item of cart.items) {
        const reservation = await this.inventoryService.reserve(
          item.productVariantId,
          item.quantity,
        );
        await this.inventoryService.consumeReservation(reservation.id);
        consumed.push({ productVariantId: item.productVariantId, quantity: item.quantity });
      }
    } catch (error) {
      await this.rollbackConsumedLines(consumed, userId);
      throw error;
    }

    const isOnlinePaid = dto.paymentMethod === PaymentMethod.ONLINE_STUB;
    const orderNumber = generateOrderNumber();
    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        orderNumber,
        invoiceNumber: `INV-${orderNumber}`,
        userId,
        status: isOnlinePaid ? OrderStatus.CONFIRMED : OrderStatus.PENDING,
        paymentMethod: dto.paymentMethod,
        paymentStatus: isOnlinePaid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        shippingAddress: {
          fullName: dto.shippingAddress.fullName,
          phone: dto.shippingAddress.phone,
          line1: dto.shippingAddress.line1,
          line2: dto.shippingAddress.line2 ?? null,
          city: dto.shippingAddress.city,
          state: dto.shippingAddress.state,
          postalCode: dto.shippingAddress.postalCode ?? null,
          country: dto.shippingAddress.country ?? 'Pakistan',
        },
        subtotal: cart.subtotal,
        discountAmount,
        cardDiscountAmount,
        cardDiscountPercent: cardDiscount.eligibility?.discountPercent ?? null,
        cardHolderType:
          cardDiscountAmount > 0 ? (cardDiscount.eligibility?.holderType ?? null) : null,
        shippingAmount,
        taxAmount,
        taxBreakdown,
        totalAmount,
        couponCode: dto.couponCode ?? null,
        campaignCode: dto.campaignCode ?? null,
      }),
    );

    await this.orderItemsRepository.save(
      cart.items.map((item) =>
        this.orderItemsRepository.create({
          orderId: order.id,
          productVariantId: item.productVariantId,
          productName: item.productVariant.product?.name ?? item.productVariant.sku,
          sku: item.productVariant.sku,
          variantAttributes: item.productVariant.attributes,
          unitPrice: item.productVariant.price,
          quantity: item.quantity,
          lineTotal: item.productVariant.price * item.quantity,
        }),
      ),
    );

    await this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        orderId: order.id,
        status: order.status,
        note: 'Order placed',
        actorUserId: userId,
      }),
    );

    if (appliedCouponId) {
      await this.couponsService.redeem(appliedCouponId, userId, order.id);
    }

    await this.cartService.clear(userId);

    await this.commissionService.computeForOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerUserId: userId,
      // Commission is computed on the pre-tax goods value, never on the tax.
      totalAmount: taxableAmount,
      channel: CommissionChannel.RETAIL,
      campaignCode: order.campaignCode,
    });

    await this.notificationsService.orderConfirmation(
      order.shippingAddress.phone,
      order.orderNumber,
      order.totalAmount,
    );

    return this.findOrFail(order.id);
  }

  async listMine(userId: string, query: ListOrdersQueryDto): Promise<PaginatedResult<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.ordersRepository.findAndCount({
      where: query.status ? { userId, status: query.status } : { userId },
      relations: ORDER_RELATIONS,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async listAll(query: ListOrdersQueryDto): Promise<PaginatedResult<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const builder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.statusHistory', 'statusHistory')
      .leftJoin('users', 'user', 'user.id = order.user_id')
      .where(query.status ? 'order.status = :status' : '1 = 1', { status: query.status });

    if (query.search?.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      builder.andWhere(
        '(LOWER(order.order_number) LIKE :search OR LOWER(order.invoice_number) LIKE :search OR LOWER(user.full_name) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search },
      );
    }

    const [items, total] = await builder
      .orderBy('order.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  /** The product-variant ids that belong to this user's approved vendor account. */
  private async vendorVariantIds(
    userId: string,
  ): Promise<{ vendorId: string; variantIds: string[] }> {
    const vendorId = await this.vendorsService.getApprovedVendorIdForUser(userId);
    const products = await this.productsRepository.find({
      where: { vendorId },
      select: { id: true },
    });
    if (products.length === 0) {
      return { vendorId, variantIds: [] };
    }
    const variants = await this.variantsRepository.find({
      where: { productId: In(products.map((p) => p.id)) },
      select: { id: true },
    });
    return { vendorId, variantIds: variants.map((v) => v.id) };
  }

  /** Orders that contain at least one of the vendor's products, trimmed to their own items. */
  async listForVendor(
    userId: string,
    query: ListOrdersQueryDto,
  ): Promise<PaginatedResult<VendorOrderView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { variantIds } = await this.vendorVariantIds(userId);
    if (variantIds.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    // Distinct, newest-first order ids that include one of the vendor's items.
    const idQuery = this.ordersRepository
      .createQueryBuilder('order')
      .select('order.id', 'id')
      .innerJoin('order_items', 'oi', 'oi.order_id = order.id')
      .where('oi.product_variant_id IN (:...variantIds)', { variantIds })
      .andWhere(query.status ? 'order.status = :status' : '1 = 1', { status: query.status });

    if (query.search?.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      idQuery.andWhere(
        "(LOWER(order.order_number) LIKE :search OR LOWER(order.shipping_address ->> 'fullName') LIKE :search)",
        { search },
      );
    }

    const idRows = await idQuery
      .groupBy('order.id')
      .addSelect('MAX(order.created_at)', 'created_at')
      .orderBy('created_at', 'DESC')
      .getRawMany<{ id: string }>();

    const total = idRows.length;
    const pageIds = idRows.slice((page - 1) * limit, page * limit).map((row) => row.id);
    if (pageIds.length === 0) {
      return { items: [], total, page, limit };
    }

    const orders = await this.ordersRepository.find({
      where: { id: In(pageIds) },
      relations: { items: true },
    });
    const byId = new Map(orders.map((order) => [order.id, order]));
    const variantSet = new Set(variantIds);

    const items: VendorOrderView[] = pageIds
      .map((id) => byId.get(id))
      .filter((order): order is Order => Boolean(order))
      .map((order) => {
        const vendorItems = order.items.filter((item) => variantSet.has(item.productVariantId));
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          shippingAddress: order.shippingAddress,
          createdAt: order.createdAt,
          items: vendorItems,
          vendorItemCount: vendorItems.reduce((sum, item) => sum + item.quantity, 0),
          vendorSubtotal: roundMoney(
            vendorItems.reduce((sum, item) => sum + Number(item.lineTotal), 0),
          ),
        };
      });

    return { items, total, page, limit };
  }

  /** A vendor advances fulfillment on one of their own line items (forward only). */
  async updateItemFulfillment(
    userId: string,
    orderId: string,
    itemId: string,
    status: OrderItemFulfillmentStatus,
  ): Promise<OrderItem> {
    const { vendorId } = await this.vendorVariantIds(userId);
    const item = await this.orderItemsRepository.findOne({ where: { id: itemId, orderId } });
    if (!item) {
      throw new NotFoundException('Order item not found');
    }
    const variant = await this.variantsRepository.findOne({
      where: { id: item.productVariantId },
    });
    const product = variant
      ? await this.productsRepository.findOne({ where: { id: variant.productId } })
      : null;
    if (!product || product.vendorId !== vendorId) {
      throw new ForbiddenException('This item does not belong to your catalogue');
    }
    if (FULFILLMENT_RANK[status] < FULFILLMENT_RANK[item.fulfillmentStatus]) {
      throw new BadRequestException('Fulfillment can only move forward');
    }

    await this.orderItemsRepository.update(item.id, { fulfillmentStatus: status });
    return this.orderItemsRepository.findOneByOrFail({ id: item.id });
  }

  /** Dashboard analytics for the current vendor: catalogue + order/revenue aggregates. */
  async getVendorAnalytics(userId: string): Promise<VendorAnalytics> {
    const { vendorId, variantIds } = await this.vendorVariantIds(userId);

    const [products, activeProducts, pendingApproval] = await Promise.all([
      this.productsRepository.count({ where: { vendorId } }),
      this.productsRepository.count({ where: { vendorId, isActive: true } }),
      this.productsRepository.count({
        where: { vendorId, approvalStatus: ProductApprovalStatus.PENDING },
      }),
    ]);

    const emptyStatus = Object.values(OrderStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<OrderStatus, number>,
    );

    if (variantIds.length === 0) {
      return {
        totals: {
          products,
          activeProducts,
          pendingApproval,
          orders: 0,
          revenue: 0,
          itemsToFulfill: 0,
        },
        orderStatusBreakdown: emptyStatus,
        fulfillmentBreakdown: { pending: 0, packed: 0, shipped: 0 },
        monthlyTrend: this.lastSixMonths().map((month) => ({ month, revenue: 0, orders: 0 })),
        topProducts: [],
      };
    }

    const since = new Date();
    since.setMonth(since.getMonth() - 5, 1);
    since.setHours(0, 0, 0, 0);

    const vendorItems = () =>
      this.orderItemsRepository
        .createQueryBuilder('oi')
        .where('oi.product_variant_id IN (:...variantIds)', { variantIds });

    const [statusRows, fulfillmentRows, trendRows, topRows] = await Promise.all([
      vendorItems()
        .innerJoin('orders', 'o', 'o.id = oi.order_id')
        .select('o.status', 'status')
        .addSelect('COUNT(DISTINCT o.id)::int', 'orders')
        .addSelect('COALESCE(SUM(oi.line_total), 0)::float', 'revenue')
        .groupBy('o.status')
        .getRawMany<{ status: OrderStatus; orders: number; revenue: number }>(),
      vendorItems()
        .select('oi.fulfillment_status', 'status')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('oi.fulfillment_status')
        .getRawMany<{ status: string; count: number }>(),
      vendorItems()
        .innerJoin('orders', 'o', 'o.id = oi.order_id')
        .select("to_char(o.created_at, 'YYYY-MM')", 'month')
        .addSelect('COUNT(DISTINCT o.id)::int', 'orders')
        .addSelect('COALESCE(SUM(oi.line_total), 0)::float', 'revenue')
        .andWhere('o.created_at >= :since', { since })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany<{ month: string; orders: number; revenue: number }>(),
      vendorItems()
        .select('oi.product_name', 'name')
        .addSelect('SUM(oi.quantity)::int', 'quantity')
        .addSelect('COALESCE(SUM(oi.line_total), 0)::float', 'revenue')
        .groupBy('oi.product_name')
        .orderBy('revenue', 'DESC')
        .limit(5)
        .getRawMany<{ name: string; quantity: number; revenue: number }>(),
    ]);

    const orderStatusBreakdown = { ...emptyStatus };
    let orders = 0;
    let revenue = 0;
    for (const row of statusRows) {
      orderStatusBreakdown[row.status] = row.orders;
      orders += row.orders;
      if (row.status !== OrderStatus.CANCELLED && row.status !== OrderStatus.RETURNED) {
        revenue += row.revenue;
      }
    }

    const fulfillmentBreakdown = { pending: 0, packed: 0, shipped: 0 };
    for (const row of fulfillmentRows) {
      if (row.status in fulfillmentBreakdown) {
        fulfillmentBreakdown[row.status as keyof typeof fulfillmentBreakdown] = row.count;
      }
    }

    const trendByMonth = new Map(trendRows.map((row) => [row.month, row]));
    const monthlyTrend = this.lastSixMonths().map((month) => ({
      month,
      revenue: roundMoney(trendByMonth.get(month)?.revenue ?? 0),
      orders: trendByMonth.get(month)?.orders ?? 0,
    }));

    return {
      totals: {
        products,
        activeProducts,
        pendingApproval,
        orders,
        revenue: roundMoney(revenue),
        itemsToFulfill: fulfillmentBreakdown.pending + fulfillmentBreakdown.packed,
      },
      orderStatusBreakdown,
      fulfillmentBreakdown,
      monthlyTrend,
      topProducts: topRows.map((row) => ({
        name: row.name,
        quantity: row.quantity,
        revenue: roundMoney(row.revenue),
      })),
    };
  }

  /** The last six 'YYYY-MM' month keys, oldest first. */
  private lastSixMonths(): string[] {
    const months: string[] = [];
    const cursor = new Date();
    cursor.setDate(1);
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }

  async getForUser(userId: string, orderId: string): Promise<Order> {
    const order = await this.findOrFail(orderId);
    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }
    return order;
  }

  async findOrFail(orderId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ORDER_RELATIONS,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateStatus(
    orderId: string,
    nextStatus: OrderStatus,
    actorUserId: string,
    note?: string,
    restock = true,
  ): Promise<Order> {
    const order = await this.findOrFail(orderId);
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(`Cannot move an order from ${order.status} to ${nextStatus}`);
    }

    if (nextStatus === OrderStatus.CANCELLED) {
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new BadRequestException('This order can no longer be cancelled');
      }
      // Cancelled before shipment: nothing was ever received by the buyer,
      // so the sale itself is voided rather than recorded as a return.
      for (const item of order.items) {
        await this.inventoryService.voidSale(
          item.productVariantId,
          item.quantity,
          actorUserId,
          `Order ${order.orderNumber} cancelled`,
        );
      }
    } else if (nextStatus === OrderStatus.RETURNED) {
      // A genuine post-delivery return: the sale stands, stock comes back
      // unless the returns workflow (Phase 7) says this batch is a write-off.
      for (const item of order.items) {
        await this.inventoryService.recordReturn(
          item.productVariantId,
          item.quantity,
          restock,
          actorUserId,
          `Order ${order.orderNumber} returned`,
        );
      }
    }

    if (nextStatus === OrderStatus.CANCELLED || nextStatus === OrderStatus.RETURNED) {
      await this.commissionService.reverseForOrder(order.id);
    }

    if (
      (nextStatus === OrderStatus.CANCELLED || nextStatus === OrderStatus.RETURNED) &&
      order.paymentStatus === PaymentStatus.PAID
    ) {
      await this.ordersRepository.update(order.id, { paymentStatus: PaymentStatus.REFUNDED });
    }

    await this.ordersRepository.update(order.id, { status: nextStatus });
    await this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        orderId: order.id,
        status: nextStatus,
        note: note ?? null,
        actorUserId,
      }),
    );

    const recipient = order.shippingAddress.phone;
    if (nextStatus === OrderStatus.SHIPPED) {
      await this.notificationsService.orderDispatched(recipient, order.orderNumber);
    } else if (nextStatus === OrderStatus.DELIVERED) {
      await this.notificationsService.orderDelivered(recipient, order.orderNumber);
    }

    return this.findOrFail(orderId);
  }

  private async rollbackConsumedLines(
    consumed: ConsumedLine[],
    actorUserId: string,
  ): Promise<void> {
    for (const line of consumed) {
      await this.inventoryService.voidSale(
        line.productVariantId,
        line.quantity,
        actorUserId,
        'Checkout rolled back: another item in the order was out of stock',
      );
    }
  }
}
