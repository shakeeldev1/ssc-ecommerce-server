import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { CommissionService } from '@/modules/commission/commission.service';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { ShippingAddressDto } from '@/modules/orders/dto/shipping-address.dto';
import { CheckoutWholesaleDto } from '@/modules/wholesale/dto/checkout-wholesale.dto';
import { ListWholesaleOrdersQueryDto } from '@/modules/wholesale/dto/list-wholesale-orders-query.dto';
import {
  ALLOWED_STATUS_TRANSITIONS,
  CANCELLABLE_STATUSES,
  OrderStatus,
} from '@/modules/orders/enums/order-status.enum';
import { PaymentMethod } from '@/modules/orders/enums/payment-method.enum';
import { PaymentStatus } from '@/modules/orders/enums/payment-status.enum';
import { generateOrderNumber } from '@/modules/orders/utils/generate-order-number.util';
import { TaxService } from '@/modules/tax/tax.service';
import { WholesaleOrderItem } from '@/modules/wholesale/entities/wholesale-order-item.entity';
import { WholesaleOrderStatusHistory } from '@/modules/wholesale/entities/wholesale-order-status-history.entity';
import { WholesaleOrder } from '@/modules/wholesale/entities/wholesale-order.entity';
import { WholesaleCartService } from '@/modules/wholesale/wholesale-cart.service';

const ORDER_RELATIONS = { items: true, statusHistory: true };

interface ConsumedLine {
  productVariantId: string;
  quantity: number;
}

@Injectable()
export class WholesaleOrdersService {
  constructor(
    @InjectRepository(WholesaleOrder)
    private readonly ordersRepository: Repository<WholesaleOrder>,
    @InjectRepository(WholesaleOrderItem)
    private readonly orderItemsRepository: Repository<WholesaleOrderItem>,
    @InjectRepository(WholesaleOrderStatusHistory)
    private readonly statusHistoryRepository: Repository<WholesaleOrderStatusHistory>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    private readonly cartService: WholesaleCartService,
    private readonly inventoryService: InventoryService,
    private readonly commissionService: CommissionService,
    private readonly taxService: TaxService,
  ) {}

  async checkout(buyerUserId: string, dto: CheckoutWholesaleDto): Promise<WholesaleOrder> {
    const cart = await this.cartService.getSummary(buyerUserId);
    if (cart.lines.length === 0) {
      throw new BadRequestException('Your wholesale cart is empty');
    }

    const subtotal = cart.subtotal;
    const taxBreakdown = this.taxService.computeTax(subtotal);
    const taxAmount = taxBreakdown.totalTax;
    const totalAmount = subtotal + taxAmount;

    const consumed: ConsumedLine[] = [];
    try {
      for (const line of cart.lines) {
        const reservation = await this.inventoryService.reserve(
          line.item.productVariantId,
          line.item.quantity,
        );
        await this.inventoryService.consumeReservation(reservation.id);
        consumed.push({
          productVariantId: line.item.productVariantId,
          quantity: line.item.quantity,
        });
      }
    } catch (error) {
      await this.rollbackConsumedLines(consumed, buyerUserId);
      throw error;
    }

    const isOnlinePaid = dto.paymentMethod === PaymentMethod.ONLINE_STUB;
    const orderNumber = generateOrderNumber();
    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        orderNumber,
        invoiceNumber: `INV-${orderNumber}`,
        buyerUserId,
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
        subtotal,
        taxAmount,
        taxBreakdown,
        totalAmount,
      }),
    );

    await this.orderItemsRepository.save(
      cart.lines.map((line) =>
        this.orderItemsRepository.create({
          orderId: order.id,
          productVariantId: line.item.productVariantId,
          productName: line.item.productVariant.product?.name ?? line.item.productVariant.sku,
          sku: line.item.productVariant.sku,
          variantAttributes: line.item.productVariant.attributes,
          unitPrice: line.unitPrice,
          quantity: line.item.quantity,
          lineTotal: line.lineTotal,
        }),
      ),
    );

    await this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        orderId: order.id,
        status: order.status,
        note: 'Wholesale order placed',
        actorUserId: buyerUserId,
      }),
    );

    await this.cartService.clear(buyerUserId);

    await this.commissionService.computeForOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerUserId,
      // Commission is computed on the pre-tax goods value, never on the tax.
      totalAmount: subtotal,
      channel: CommissionChannel.WHOLESALE,
    });

    return this.findOrFail(order.id);
  }

  /** Places a single-line order at an accepted quotation's fixed price/quantity, bypassing the cart and any tier pricing. */
  async createFromQuotation(
    buyerUserId: string,
    productVariantId: string,
    quantity: number,
    pricePerUnit: number,
    shippingAddress: ShippingAddressDto,
    paymentMethod: PaymentMethod,
  ): Promise<WholesaleOrder> {
    const variant = await this.variantsRepository.findOne({
      where: { id: productVariantId },
      relations: { product: true },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const reservation = await this.inventoryService.reserve(productVariantId, quantity);
    await this.inventoryService.consumeReservation(reservation.id);

    const isOnlinePaid = paymentMethod === PaymentMethod.ONLINE_STUB;
    const orderNumber = generateOrderNumber();
    const lineTotal = pricePerUnit * quantity;
    const taxBreakdown = this.taxService.computeTax(lineTotal);
    const taxAmount = taxBreakdown.totalTax;
    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        orderNumber,
        invoiceNumber: `INV-${orderNumber}`,
        buyerUserId,
        status: isOnlinePaid ? OrderStatus.CONFIRMED : OrderStatus.PENDING,
        paymentMethod,
        paymentStatus: isOnlinePaid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        shippingAddress: {
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 ?? null,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode ?? null,
          country: shippingAddress.country ?? 'Pakistan',
        },
        subtotal: lineTotal,
        taxAmount,
        taxBreakdown,
        totalAmount: lineTotal + taxAmount,
      }),
    );

    await this.orderItemsRepository.save(
      this.orderItemsRepository.create({
        orderId: order.id,
        productVariantId,
        productName: variant.product?.name ?? variant.sku,
        sku: variant.sku,
        variantAttributes: variant.attributes,
        unitPrice: pricePerUnit,
        quantity,
        lineTotal,
      }),
    );

    await this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        orderId: order.id,
        status: order.status,
        note: 'Order placed from an accepted quotation',
        actorUserId: buyerUserId,
      }),
    );

    await this.commissionService.computeForOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerUserId,
      // Commission is computed on the pre-tax goods value, never on the tax.
      totalAmount: lineTotal,
      channel: CommissionChannel.WHOLESALE,
    });

    return this.findOrFail(order.id);
  }

  async listMine(
    buyerUserId: string,
    query: ListWholesaleOrdersQueryDto,
  ): Promise<PaginatedResult<WholesaleOrder>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.ordersRepository.findAndCount({
      where: query.status ? { buyerUserId, status: query.status } : { buyerUserId },
      relations: ORDER_RELATIONS,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async listAll(query: ListWholesaleOrdersQueryDto): Promise<PaginatedResult<WholesaleOrder>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.ordersRepository.findAndCount({
      where: query.status ? { status: query.status } : {},
      relations: ORDER_RELATIONS,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getForUser(buyerUserId: string, orderId: string): Promise<WholesaleOrder> {
    const order = await this.findOrFail(orderId);
    if (order.buyerUserId !== buyerUserId) {
      throw new ForbiddenException('This order does not belong to you');
    }
    return order;
  }

  async findOrFail(orderId: string): Promise<WholesaleOrder> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ORDER_RELATIONS,
    });
    if (!order) {
      throw new NotFoundException('Wholesale order not found');
    }
    return order;
  }

  async updateStatus(
    orderId: string,
    nextStatus: OrderStatus,
    actorUserId: string,
    note?: string,
    restock = true,
  ): Promise<WholesaleOrder> {
    const order = await this.findOrFail(orderId);
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(`Cannot move an order from ${order.status} to ${nextStatus}`);
    }

    if (nextStatus === OrderStatus.CANCELLED) {
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new BadRequestException('This order can no longer be cancelled');
      }
      for (const item of order.items) {
        await this.inventoryService.voidSale(
          item.productVariantId,
          item.quantity,
          actorUserId,
          `Wholesale order ${order.orderNumber} cancelled`,
        );
      }
    } else if (nextStatus === OrderStatus.RETURNED) {
      for (const item of order.items) {
        await this.inventoryService.recordReturn(
          item.productVariantId,
          item.quantity,
          restock,
          actorUserId,
          `Wholesale order ${order.orderNumber} returned`,
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
        'Wholesale checkout rolled back: another item in the order was out of stock',
      );
    }
  }
}
