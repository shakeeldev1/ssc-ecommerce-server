import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { Product } from '@/modules/catalog/entities/product.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
import { CreateReviewDto } from '@/modules/reviews/dto/create-review.dto';
import { ProductReview } from '@/modules/reviews/entities/product-review.entity';
import { ReviewStatus } from '@/modules/reviews/enums/review-status.enum';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProductReview)
    private readonly reviewsRepository: Repository<ProductReview>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listApprovedForProduct(productId: string): Promise<ProductReview[]> {
    return this.reviewsRepository.find({
      where: { productId, status: ReviewStatus.APPROVED },
      order: { createdAt: 'DESC' },
    });
  }

  async listPending(): Promise<ProductReview[]> {
    return this.reviewsRepository.find({
      where: { status: ReviewStatus.PENDING },
      // Load the product so the moderation queue can show its name, not just an id.
      relations: { product: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(userId: string, productId: string, dto: CreateReviewDto): Promise<ProductReview> {
    const product = await this.productsRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.reviewsRepository.findOne({ where: { userId, productId } });
    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const orderId = await this.findDeliveredOrderForProduct(userId, productId);
    if (!orderId) {
      throw new BadRequestException('You can only review products from a delivered order');
    }

    return this.reviewsRepository.save(
      this.reviewsRepository.create({
        productId,
        userId,
        orderId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      }),
    );
  }

  async moderate(
    id: string,
    status: ReviewStatus.APPROVED | ReviewStatus.REJECTED,
    actorUserId: string,
  ): Promise<ProductReview> {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    await this.reviewsRepository.update(id, { status });

    await this.auditLogService.record({
      actorUserId,
      action: 'review.moderated',
      entityName: 'ProductReview',
      entityId: id,
      previousValue: { status: review.status },
      newValue: { status, productId: review.productId },
    });

    return { ...review, status };
  }

  private async findDeliveredOrderForProduct(
    userId: string,
    productId: string,
  ): Promise<string | null> {
    const variants = await this.variantsRepository.find({ where: { productId } });
    if (variants.length === 0) {
      return null;
    }
    const variantIds = variants.map((v) => v.id);

    const orderItems = await this.orderItemsRepository.find({
      where: { productVariantId: In(variantIds) },
    });
    if (orderItems.length === 0) {
      return null;
    }

    const orders = await this.ordersRepository.find({
      where: {
        id: In(orderItems.map((item) => item.orderId)),
        userId,
        status: OrderStatus.DELIVERED,
      },
    });

    return orders[0]?.id ?? null;
  }
}
