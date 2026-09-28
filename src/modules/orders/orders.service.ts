import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
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
import { InventoryService } from '@/modules/inventory/inventory.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { TaxService } from '@/modules/tax/tax.service';

const ORDER_RELATIONS = { items: true, statusHistory: true };

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
