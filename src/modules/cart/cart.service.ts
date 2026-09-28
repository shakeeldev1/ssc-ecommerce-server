import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '@/modules/cart/entities/cart-item.entity';
import { CartSummary } from '@/modules/cart/interfaces/cart-summary.interface';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';

const CART_ITEM_RELATIONS = { productVariant: { product: true } };

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
  ) {}

  async getSummary(userId: string): Promise<CartSummary> {
    const items = await this.cartItemsRepository.find({
      where: { userId },
      relations: CART_ITEM_RELATIONS,
      order: { createdAt: 'ASC' },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + item.productVariant.price * item.quantity,
      0,
    );
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return { items, subtotal, totalItems };
  }

  async addItem(userId: string, productVariantId: string, quantity: number): Promise<CartSummary> {
    const variant = await this.variantsRepository.findOne({ where: { id: productVariantId } });
    if (!variant || !variant.isActive) {
      throw new NotFoundException('Product variant not found');
    }

    const existing = await this.cartItemsRepository.findOne({
      where: { userId, productVariantId },
    });

    if (existing) {
      await this.cartItemsRepository.update(existing.id, {
        quantity: existing.quantity + quantity,
      });
    } else {
      await this.cartItemsRepository.save(
        this.cartItemsRepository.create({ userId, productVariantId, quantity }),
      );
    }

    return this.getSummary(userId);
  }

  async updateItem(
    userId: string,
    productVariantId: string,
    quantity: number,
  ): Promise<CartSummary> {
    const existing = await this.findItemOrFail(userId, productVariantId);
    await this.cartItemsRepository.update(existing.id, { quantity });
    return this.getSummary(userId);
  }

  async removeItem(userId: string, productVariantId: string): Promise<CartSummary> {
    const existing = await this.findItemOrFail(userId, productVariantId);
    await this.cartItemsRepository.delete(existing.id);
    return this.getSummary(userId);
  }

  async clear(userId: string): Promise<void> {
    await this.cartItemsRepository.delete({ userId });
  }

  private async findItemOrFail(userId: string, productVariantId: string): Promise<CartItem> {
    const existing = await this.cartItemsRepository.findOne({
      where: { userId, productVariantId },
    });
    if (!existing) {
      throw new BadRequestException('This item is not in your cart');
    }
    return existing;
  }
}
