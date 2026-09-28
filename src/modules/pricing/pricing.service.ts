import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { Product } from '@/modules/catalog/entities/product.entity';
import { UpsertBuyerPriceDto } from '@/modules/pricing/dto/upsert-buyer-price.dto';
import { UpsertPriceTierDto } from '@/modules/pricing/dto/upsert-price-tier.dto';
import { BuyerPrice } from '@/modules/pricing/entities/buyer-price.entity';
import { PriceTier } from '@/modules/pricing/entities/price-tier.entity';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { VendorsService } from '@/modules/vendors/vendors.service';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PriceTier)
    private readonly tiersRepository: Repository<PriceTier>,
    @InjectRepository(BuyerPrice)
    private readonly buyerPricesRepository: Repository<BuyerPrice>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly vendorsService: VendorsService,
  ) {}

  async listTiers(productVariantId: string): Promise<PriceTier[]> {
    return this.tiersRepository.find({
      where: { productVariantId },
      order: { minQuantity: 'ASC' },
    });
  }

  async upsertTier(
    productVariantId: string,
    dto: UpsertPriceTierDto,
    actor: AuthenticatedUser,
  ): Promise<PriceTier> {
    await this.assertCanManageVariant(productVariantId, actor);

    const existing = await this.tiersRepository.findOne({
      where: { productVariantId, minQuantity: dto.minQuantity },
    });
    if (existing) {
      await this.tiersRepository.update(existing.id, { pricePerUnit: dto.pricePerUnit });
      return this.tiersRepository.findOneOrFail({ where: { id: existing.id } });
    }

    return this.tiersRepository.save(
      this.tiersRepository.create({
        productVariantId,
        minQuantity: dto.minQuantity,
        pricePerUnit: dto.pricePerUnit,
      }),
    );
  }

  async deleteTier(
    productVariantId: string,
    tierId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.assertCanManageVariant(productVariantId, actor);

    const tier = await this.tiersRepository.findOne({ where: { id: tierId } });
    if (!tier || tier.productVariantId !== productVariantId) {
      throw new NotFoundException('Price tier not found for this variant');
    }
    await this.tiersRepository.delete(tierId);
  }

  async listBuyerPrices(productVariantId: string, actor: AuthenticatedUser): Promise<BuyerPrice[]> {
    await this.assertCanManageVariant(productVariantId, actor);
    return this.buyerPricesRepository.find({ where: { productVariantId } });
  }

  async upsertBuyerPrice(
    productVariantId: string,
    dto: UpsertBuyerPriceDto,
    actor: AuthenticatedUser,
  ): Promise<BuyerPrice> {
    await this.assertCanManageVariant(productVariantId, actor);

    const existing = await this.buyerPricesRepository.findOne({
      where: { productVariantId, buyerUserId: dto.buyerUserId },
    });
    if (existing) {
      await this.buyerPricesRepository.update(existing.id, { pricePerUnit: dto.pricePerUnit });
      return this.buyerPricesRepository.findOneOrFail({ where: { id: existing.id } });
    }

    return this.buyerPricesRepository.save(
      this.buyerPricesRepository.create({
        productVariantId,
        buyerUserId: dto.buyerUserId,
        pricePerUnit: dto.pricePerUnit,
      }),
    );
  }

  /**
   * A buyer-specific negotiated price always wins; otherwise the highest
   * quantity tier the order still qualifies for; otherwise the variant's
   * normal (retail) price, so a wholesale-eligible variant with no tiers
   * configured yet is still purchasable rather than blocked.
   */
  async resolveUnitPrice(
    productVariantId: string,
    buyerUserId: string,
    quantity: number,
  ): Promise<number> {
    const buyerPrice = await this.buyerPricesRepository.findOne({
      where: { productVariantId, buyerUserId },
    });
    if (buyerPrice) {
      return buyerPrice.pricePerUnit;
    }

    const tiers = await this.listTiers(productVariantId);
    const applicableTier = [...tiers].reverse().find((tier) => quantity >= tier.minQuantity);
    if (applicableTier) {
      return applicableTier.pricePerUnit;
    }

    const variant = await this.variantsRepository.findOne({ where: { id: productVariantId } });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    return variant.price;
  }

  /** Also used by the wholesale RFQ flow to authorize who may quote on a variant. */
  async assertCanManageVariant(productVariantId: string, actor: AuthenticatedUser): Promise<void> {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const variant = await this.variantsRepository.findOne({ where: { id: productVariantId } });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    const product = await this.productsRepository.findOne({ where: { id: variant.productId } });
    if (!product || product.vendorId === null) {
      throw new ForbiddenException('Only a super admin can manage pricing for this variant');
    }

    const ownVendorId = await this.vendorsService.getApprovedVendorIdForUser(actor.id);
    if (product.vendorId !== ownVendorId) {
      throw new ForbiddenException('You do not have permission to manage pricing for this variant');
    }
  }
}
