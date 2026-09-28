import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { CommissionService } from '@/modules/commission/commission.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
import { OrdersService } from '@/modules/orders/orders.service';
import { CreateReturnRequestDto } from '@/modules/returns/dto/create-return-request.dto';
import { DecideReturnRequestDto } from '@/modules/returns/dto/decide-return-request.dto';
import { Refund } from '@/modules/returns/entities/refund.entity';
import { ReturnRequest } from '@/modules/returns/entities/return-request.entity';
import { ReturnRequestStatus } from '@/modules/returns/enums/return-request-status.enum';
import { ReturnRequestType } from '@/modules/returns/enums/return-request-type.enum';
import { PaymentStatus } from '@/modules/orders/enums/payment-status.enum';
import { WholesaleOrderItem } from '@/modules/wholesale/entities/wholesale-order-item.entity';
import { WholesaleOrdersService } from '@/modules/wholesale/wholesale-orders.service';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly returnsRepository: Repository<ReturnRequest>,
    @InjectRepository(Refund)
    private readonly refundsRepository: Repository<Refund>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(WholesaleOrderItem)
    private readonly wholesaleOrderItemsRepository: Repository<WholesaleOrderItem>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    private readonly ordersService: OrdersService,
    private readonly wholesaleOrdersService: WholesaleOrdersService,
    private readonly inventoryService: InventoryService,
    private readonly commissionService: CommissionService,
  ) {}

  async create(buyerUserId: string, dto: CreateReturnRequestDto): Promise<ReturnRequest> {
    const order =
      dto.orderChannel === CommissionChannel.RETAIL
        ? await this.ordersService.getForUser(buyerUserId, dto.orderId)
        : await this.wholesaleOrdersService.getForUser(buyerUserId, dto.orderId);

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Only a delivered order can be returned or exchanged');
    }

    let orderItemId: string | null = null;
    if (dto.type === ReturnRequestType.EXCHANGE) {
      if (!dto.orderItemId || !dto.replacementVariantId) {
        throw new BadRequestException(
          'orderItemId and replacementVariantId are required for an exchange',
        );
      }
      const lineRepository =
        dto.orderChannel === CommissionChannel.RETAIL
          ? this.orderItemsRepository
          : this.wholesaleOrderItemsRepository;
      const line = await lineRepository.findOne({ where: { id: dto.orderItemId } });
      if (!line || line.orderId !== dto.orderId) {
        throw new BadRequestException('That order line does not belong to this order');
      }

      const replacement = await this.variantsRepository.findOne({
        where: { id: dto.replacementVariantId },
      });
      if (!replacement || !replacement.isActive) {
        throw new BadRequestException('Replacement variant not found');
      }
      orderItemId = dto.orderItemId;
    }

    return this.returnsRepository.save(
      this.returnsRepository.create({
        orderChannel: dto.orderChannel,
        orderId: dto.orderId,
        orderNumber: order.orderNumber,
        buyerUserId,
        type: dto.type,
        reason: dto.reason,
        restock: dto.restock ?? true,
        orderItemId,
        replacementVariantId:
          dto.type === ReturnRequestType.EXCHANGE ? dto.replacementVariantId : null,
      }),
    );
  }

  async listMine(buyerUserId: string): Promise<ReturnRequest[]> {
    return this.returnsRepository.find({ where: { buyerUserId }, order: { createdAt: 'DESC' } });
  }

  async listAll(status?: ReturnRequestStatus): Promise<ReturnRequest[]> {
    const where: FindOptionsWhere<ReturnRequest> = status ? { status } : {};
    return this.returnsRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOrFail(id: string): Promise<ReturnRequest> {
    const request = await this.returnsRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Return/exchange request not found');
    }
    return request;
  }

  async getForUser(buyerUserId: string, id: string): Promise<ReturnRequest> {
    const request = await this.findOrFail(id);
    if (request.buyerUserId !== buyerUserId) {
      throw new ForbiddenException('This request does not belong to you');
    }
    return request;
  }

  /** 404 if this return was approved but had nothing to refund (e.g. an unpaid COD order). */
  async getRefundForRequest(returnRequestId: string): Promise<Refund> {
    const refund = await this.refundsRepository.findOne({ where: { returnRequestId } });
    if (!refund) {
      throw new NotFoundException('No refund was issued for this request');
    }
    return refund;
  }

  async decide(
    id: string,
    actorUserId: string,
    dto: DecideReturnRequestDto,
  ): Promise<ReturnRequest> {
    const request = await this.findOrFail(id);
    if (request.status !== ReturnRequestStatus.REQUESTED) {
      throw new BadRequestException('This request has already been decided');
    }

    if (dto.decision === ReturnRequestStatus.APPROVED) {
      if (request.type === ReturnRequestType.RETURN) {
        await this.processReturn(request, actorUserId);
      } else {
        await this.processExchange(request, actorUserId);
      }
    }

    await this.returnsRepository.update(id, {
      status: dto.decision,
      decisionNote: dto.note ?? null,
      decidedByUserId: actorUserId,
      decidedAt: new Date(),
    });
    return this.findOrFail(id);
  }

  private async processReturn(request: ReturnRequest, actorUserId: string): Promise<void> {
    if (request.orderChannel === CommissionChannel.RETAIL) {
      const before = await this.ordersService.findOrFail(request.orderId);
      await this.ordersService.updateStatus(
        request.orderId,
        OrderStatus.RETURNED,
        actorUserId,
        `Approved return request ${request.id}`,
        request.restock,
      );
      await this.recordRefundIfPaid(request, before.paymentStatus, before.totalAmount);
    } else {
      const before = await this.wholesaleOrdersService.findOrFail(request.orderId);
      await this.wholesaleOrdersService.updateStatus(
        request.orderId,
        OrderStatus.RETURNED,
        actorUserId,
        `Approved return request ${request.id}`,
        request.restock,
      );
      await this.recordRefundIfPaid(request, before.paymentStatus, before.totalAmount);
    }
  }

  private async processExchange(request: ReturnRequest, actorUserId: string): Promise<void> {
    const lineRepository =
      request.orderChannel === CommissionChannel.RETAIL
        ? this.orderItemsRepository
        : this.wholesaleOrderItemsRepository;
    const line = await lineRepository.findOne({ where: { id: request.orderItemId ?? '' } });
    if (!line) {
      throw new NotFoundException('The original order line no longer exists');
    }

    await this.inventoryService.recordReturn(
      line.productVariantId,
      line.quantity,
      request.restock,
      actorUserId,
      `Exchanged out on request ${request.id}`,
    );

    const reservation = await this.inventoryService.reserve(
      request.replacementVariantId as string,
      line.quantity,
    );
    await this.inventoryService.consumeReservation(reservation.id);

    await this.commissionService.reverseForOrder(request.orderId);
  }

  private async recordRefundIfPaid(
    request: ReturnRequest,
    paymentStatusBeforeReturn: PaymentStatus,
    totalAmount: number,
  ): Promise<void> {
    if (paymentStatusBeforeReturn !== PaymentStatus.PAID) {
      return;
    }
    await this.refundsRepository.save(
      this.refundsRepository.create({
        returnRequestId: request.id,
        orderChannel: request.orderChannel,
        orderId: request.orderId,
        amount: totalAmount,
        reason: `Return approved: ${request.reason}`,
      }),
    );
  }
}
