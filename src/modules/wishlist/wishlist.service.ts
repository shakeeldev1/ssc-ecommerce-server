import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@/modules/catalog/entities/product.entity';
import { WishlistItem } from '@/modules/wishlist/entities/wishlist-item.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem)
    private readonly wishlistRepository: Repository<WishlistItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async list(userId: string): Promise<WishlistItem[]> {
    return this.wishlistRepository.find({
      where: { userId },
      // Eager-load images/variants so clients can render a product card
      // (name, image, from-price, add-to-cart) without a follow-up fetch.
      relations: { product: { images: true, variants: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async add(userId: string, productId: string): Promise<WishlistItem> {
    const product = await this.productsRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.wishlistRepository.findOne({ where: { userId, productId } });
    if (existing) {
      throw new ConflictException('This product is already in your wishlist');
    }

    return this.wishlistRepository.save(this.wishlistRepository.create({ userId, productId }));
  }

  async remove(userId: string, productId: string): Promise<void> {
    const existing = await this.wishlistRepository.findOne({ where: { userId, productId } });
    if (!existing) {
      throw new NotFoundException('This product is not in your wishlist');
    }
    await this.wishlistRepository.delete(existing.id);
  }
}
