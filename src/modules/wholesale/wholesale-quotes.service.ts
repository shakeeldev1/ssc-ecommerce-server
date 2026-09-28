import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { Product } from '@/modules/catalog/entities/product.entity';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { PaymentMethod } from '@/modules/orders/enums/payment-method.enum';
import { ShippingAddressDto } from '@/modules/orders/dto/shipping-address.dto';
import { PricingService } from '@/modules/pricing/pricing.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { VendorsService } from '@/modules/vendors/vendors.service';
import { CreateQuotationDto } from '@/modules/wholesale/dto/create-quotation.dto';
import { CreateQuoteRequestDto } from '@/modules/wholesale/dto/create-quote-request.dto';
import { QuoteRequest } from '@/modules/wholesale/entities/quote-request.entity';
import { Quotation } from '@/modules/wholesale/entities/quotation.entity';
import { WholesaleOrder } from '@/modules/wholesale/entities/wholesale-order.entity';
import { QuoteRequestStatus } from '@/modules/wholesale/enums/quote-request-status.enum';
import { QuotationStatus } from '@/modules/wholesale/enums/quotation-status.enum';
import { WholesaleOrdersService } from '@/modules/wholesale/wholesale-orders.service';

@Injectable()
export class WholesaleQuotesService {
  constructor(
    @InjectRepository(QuoteRequest)
    private readonly requestsRepository: Repository<QuoteRequest>,
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly pricingService: PricingService,
    private readonly vendorsService: VendorsService,
    private readonly ordersService: WholesaleOrdersService,
  ) {}

  async createRequest(buyerUserId: string, dto: CreateQuoteRequestDto): Promise<QuoteRequest> {
    const variant = await this.variantsRepository.findOne({
      where: { id: dto.productVariantId },
    });
    if (!variant || !variant.isWholesaleEligible) {
      throw new NotFoundException('Wholesale-eligible variant not found');
    }

    return this.requestsRepository.save(
      this.requestsRepository.create({
        buyerUserId,
        productVariantId: dto.productVariantId,
        requestedQuantity: dto.requestedQuantity,
        message: dto.message ?? null,
      }),
    );
  }

  async listMine(buyerUserId: string): Promise<QuoteRequest[]> {
    return this.requestsRepository.find({
      where: { buyerUserId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Incoming RFQs for a vendor's own wholesale-eligible variants (or every request, for admin). */
  async listIncoming(actor: AuthenticatedUser): Promise<QuoteRequest[]> {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return this.requestsRepository.find({ order: { createdAt: 'DESC' } });
    }

    const vendorId = await this.vendorsService.getApprovedVendorIdForUser(actor.id);
    const ownProducts = await this.productsRepository.find({ where: { vendorId } });
    if (ownProducts.length === 0) {
      return [];
    }
    const ownVariants = await this.variantsRepository.find({
      where: { productId: In(ownProducts.map((p) => p.id)) },
    });
    if (ownVariants.length === 0) {
      return [];
    }

    return this.requestsRepository.find({
      where: { productVariantId: In(ownVariants.map((v) => v.id)) },
      order: { createdAt: 'DESC' },
    });
  }

  async findRequestOrFail(id: string): Promise<QuoteRequest> {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Quote request not found');
    }
    return request;
  }

  async createQuotation(
    requestId: string,
    dto: CreateQuotationDto,
    actor: AuthenticatedUser,
  ): Promise<Quotation> {
    const request = await this.findRequestOrFail(requestId);
    if (request.status !== QuoteRequestStatus.OPEN) {
      throw new BadRequestException('This request has already been quoted or closed');
    }
    await this.pricingService.assertCanManageVariant(request.productVariantId, actor);

    const quotation = await this.quotationsRepository.save(
      this.quotationsRepository.create({
        quoteRequestId: requestId,
        issuedByUserId: actor.id,
        pricePerUnit: dto.pricePerUnit,
        quantity: dto.quantity ?? request.requestedQuantity,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes ?? null,
      }),
    );

    await this.requestsRepository.update(requestId, { status: QuoteRequestStatus.QUOTED });
    return quotation;
  }

  async findQuotationOrFail(id: string): Promise<Quotation> {
    const quotation = await this.quotationsRepository.findOne({ where: { id } });
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }
    return quotation;
  }

  async accept(
    quotationId: string,
    buyerUserId: string,
    shippingAddress: ShippingAddressDto,
    paymentMethod: PaymentMethod,
  ): Promise<WholesaleOrder> {
    const quotation = await this.assertBuyerOwnsQuotation(quotationId, buyerUserId);
    await this.assertQuotationIsActionable(quotation);

    const request = await this.findRequestOrFail(quotation.quoteRequestId);
    const order = await this.ordersService.createFromQuotation(
      buyerUserId,
      request.productVariantId,
      quotation.quantity,
      quotation.pricePerUnit,
      shippingAddress,
      paymentMethod,
    );

    await this.quotationsRepository.update(quotationId, { status: QuotationStatus.ACCEPTED });
    await this.requestsRepository.update(request.id, { status: QuoteRequestStatus.CLOSED });

    return order;
  }

  async reject(quotationId: string, buyerUserId: string): Promise<Quotation> {
    const quotation = await this.assertBuyerOwnsQuotation(quotationId, buyerUserId);
    await this.assertQuotationIsActionable(quotation);

    await this.quotationsRepository.update(quotationId, { status: QuotationStatus.REJECTED });
    await this.requestsRepository.update(quotation.quoteRequestId, {
      status: QuoteRequestStatus.CLOSED,
    });

    return this.findQuotationOrFail(quotationId);
  }

  private async assertBuyerOwnsQuotation(
    quotationId: string,
    buyerUserId: string,
  ): Promise<Quotation> {
    const quotation = await this.findQuotationOrFail(quotationId);
    const request = await this.findRequestOrFail(quotation.quoteRequestId);
    if (request.buyerUserId !== buyerUserId) {
      throw new ForbiddenException('This quotation was not issued for your request');
    }
    return quotation;
  }

  private async assertQuotationIsActionable(quotation: Quotation): Promise<void> {
    if (quotation.status !== QuotationStatus.PENDING) {
      throw new BadRequestException('This quotation is no longer pending');
    }
    if (quotation.validUntil && quotation.validUntil.getTime() < Date.now()) {
      // Lazily transition to EXPIRED on first touch past validUntil, mirroring
      // the stock-reservation expiry pattern from Phase 3.
      await this.quotationsRepository.update(quotation.id, { status: QuotationStatus.EXPIRED });
      throw new BadRequestException('This quotation has expired');
    }
  }
}
