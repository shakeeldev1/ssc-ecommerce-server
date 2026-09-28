import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { PricingService } from '@/modules/pricing/pricing.service';
import { WholesaleCartItem } from '@/modules/wholesale/entities/wholesale-cart-item.entity';
import { WholesaleCartSummary } from '@/modules/wholesale/interfaces/wholesale-cart-summary.interface';

const CART_ITEM_RELATIONS = { productVariant: { product: true } };

@Injectable()
export class WholesaleCartService {
  constructor(
    @InjectRepository(WholesaleCartItem)
    private readonly cartItemsRepository: Repository<WholesaleCartItem>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    private readonly pricingService: PricingService,
  ) {}

  async getSummary(buyerUserId: string): Promise<WholesaleCartSummary> {
    const items = await this.cartItemsRepository.find({
      where: { buyerUserId },
      relations: CART_ITEM_RELATIONS,
      order: { createdAt: 'ASC' },
    });

    const lines = await Promise.all(
      items.map(async (item) => {
        const unitPrice = await this.pricingService.resolveUnitPrice(
          item.productVariantId,
          buyerUserId,
          item.quantity,
        );
        return { item, unitPrice, lineTotal: unitPrice * item.quantity };
      }),
    );

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return { lines, subtotal, totalItems };
  }

  async addItem(
    buyerUserId: string,
    productVariantId: string,
    quantity: number,
  ): Promise<WholesaleCartSummary> {
    const variant = await this.variantsRepository.findOne({ where: { id: productVariantId } });
    if (!variant || !variant.isActive || !variant.isWholesaleEligible) {
      throw new NotFoundException('Wholesale-eligible variant not found');
    }

    const existing = await this.cartItemsRepository.findOne({
      where: { buyerUserId, productVariantId },
    });
    const newQuantity = (existing?.quantity ?? 0) + quantity;
    this.assertMeetsMoq(variant, newQuantity);

    if (existing) {
      await this.cartItemsRepository.update(existing.id, { quantity: newQuantity });
    } else {
      await this.cartItemsRepository.save(
        this.cartItemsRepository.create({ buyerUserId, productVariantId, quantity: newQuantity }),
      );
    }

    return this.getSummary(buyerUserId);
  }

  async updateItem(
    buyerUserId: string,
    productVariantId: string,
    quantity: number,
  ): Promise<WholesaleCartSummary> {
    const existing = await this.findItemOrFail(buyerUserId, productVariantId);
    const variant = await this.variantsRepository.findOne({ where: { id: productVariantId } });
    if (variant) {
      this.assertMeetsMoq(variant, quantity);
    }

    await this.cartItemsRepository.update(existing.id, { quantity });
    return this.getSummary(buyerUserId);
  }

  async removeItem(buyerUserId: string, productVariantId: string): Promise<WholesaleCartSummary> {
    const existing = await this.findItemOrFail(buyerUserId, productVariantId);
    await this.cartItemsRepository.delete(existing.id);
    return this.getSummary(buyerUserId);
  }

  async clear(buyerUserId: string): Promise<void> {
    await this.cartItemsRepository.delete({ buyerUserId });
  }

  private assertMeetsMoq(variant: ProductVariant, quantity: number): void {
    if (variant.wholesaleMoq !== null && quantity < variant.wholesaleMoq) {
      throw new BadRequestException(
        `This variant requires a minimum order quantity of ${variant.wholesaleMoq}`,
      );
    }
  }

  private async findItemOrFail(
    buyerUserId: string,
    productVariantId: string,
  ): Promise<WholesaleCartItem> {
    const existing = await this.cartItemsRepository.findOne({
      where: { buyerUserId, productVariantId },
    });
    if (!existing) {
      throw new BadRequestException('This item is not in your wholesale cart');
    }
    return existing;
  }
}
