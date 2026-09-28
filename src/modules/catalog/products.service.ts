import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { slugify } from '@/common/utils/slug.util';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { CreateProductVariantDto } from '@/modules/catalog/dto/create-product-variant.dto';
import { CreateProductDto } from '@/modules/catalog/dto/create-product.dto';
import { ListProductsQueryDto } from '@/modules/catalog/dto/list-products-query.dto';
import { UpdateProductVariantDto } from '@/modules/catalog/dto/update-product-variant.dto';
import { UpdateProductDto } from '@/modules/catalog/dto/update-product.dto';
import { ProductImage } from '@/modules/catalog/entities/product-image.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { Product } from '@/modules/catalog/entities/product.entity';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { MediaService } from '@/modules/media/media.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { VendorsService } from '@/modules/vendors/vendors.service';

const PRODUCT_RELATIONS = { variants: true, images: true, category: true, brand: true };

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    @InjectRepository(ProductImage)
    private readonly imagesRepository: Repository<ProductImage>,
    private readonly inventoryService: InventoryService,
    private readonly mediaService: MediaService,
    private readonly vendorsService: VendorsService,
  ) {}

  async create(dto: CreateProductDto, actor: AuthenticatedUser): Promise<Product> {
    const vendorId = await this.resolveOwnVendorId(actor);

    const product = this.productsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      categoryId: dto.categoryId,
      brandId: dto.brandId ?? null,
      vendorId,
      isStudentDiscountEligible: dto.isStudentDiscountEligible ?? false,
      specifications: dto.specifications ?? null,
      slug: await this.generateUniqueSlug(dto.name),
    });
    const saved = await this.productsRepository.save(product);
    return this.findOrFail(saved.id);
  }

  async update(id: string, dto: UpdateProductDto, actor: AuthenticatedUser): Promise<Product> {
    const product = await this.findOrFail(id);
    await this.assertCanManage(product, actor);

    await this.productsRepository.update(id, {
      name: dto.name,
      description: dto.description,
      categoryId: dto.categoryId,
      brandId: dto.brandId,
      isStudentDiscountEligible: dto.isStudentDiscountEligible,
      specifications: dto.specifications,
      isActive: dto.isActive,
    });
    return this.findOrFail(id);
  }

  async list(query: ListProductsQueryDto): Promise<PaginatedResult<Product>> {
    const where: FindOptionsWhere<Product> = { isActive: true };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.vendorId) where.vendorId = query.vendorId;
    if (query.isStudentDiscountEligible !== undefined) {
      where.isStudentDiscountEligible = query.isStudentDiscountEligible;
    }
    if (query.search) where.name = ILike(`%${query.search}%`);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.productsRepository.findAndCount({
      where,
      relations: PRODUCT_RELATIONS,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  countActive(): Promise<number> {
    return this.productsRepository.count({ where: { isActive: true } });
  }

  /** A vendor's own catalogue, including inactive listings — not the public storefront view. */
  async listMine(actor: AuthenticatedUser): Promise<Product[]> {
    const vendorId = await this.vendorsService.getApprovedVendorIdForUser(actor.id);
    return this.productsRepository.find({
      where: { vendorId },
      relations: PRODUCT_RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  async findOrFail(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: PRODUCT_RELATIONS,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async createVariant(
    productId: string,
    dto: CreateProductVariantDto,
    actor: AuthenticatedUser,
  ): Promise<ProductVariant> {
    const product = await this.findOrFail(productId);
    await this.assertCanManage(product, actor);

    const variant = await this.variantsRepository.save(
      this.variantsRepository.create({
        productId,
        sku: dto.sku,
        attributes: dto.attributes ?? {},
        price: dto.price,
        compareAtPrice: dto.compareAtPrice ?? null,
        isWholesaleEligible: dto.isWholesaleEligible ?? false,
        wholesaleMoq: dto.wholesaleMoq ?? null,
      }),
    );
    await this.inventoryService.initializeForVariant(variant.id);

    return variant;
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
    actor: AuthenticatedUser,
  ): Promise<ProductVariant> {
    const product = await this.findOrFail(productId);
    await this.assertCanManage(product, actor);

    const variant = await this.findVariantOrFail(productId, variantId);
    await this.variantsRepository.update(variant.id, dto);
    return this.findVariantOrFail(productId, variantId);
  }

  async findVariantOrFail(productId: string, variantId: string): Promise<ProductVariant> {
    const variant = await this.variantsRepository.findOne({ where: { id: variantId } });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    if (variant.productId !== productId) {
      throw new ForbiddenException('This variant does not belong to the given product');
    }
    return variant;
  }

  async addImage(
    productId: string,
    fileBuffer: Buffer,
    actor: AuthenticatedUser,
  ): Promise<ProductImage> {
    const product = await this.findOrFail(productId);
    await this.assertCanManage(product, actor);

    const uploaded = await this.mediaService.uploadImage(fileBuffer, 'product-images');
    const existingCount = await this.imagesRepository.count({ where: { productId } });

    return this.imagesRepository.save(
      this.imagesRepository.create({
        productId,
        url: uploaded.url,
        publicId: uploaded.publicId,
        isPrimary: existingCount === 0,
      }),
    );
  }

  async removeImage(productId: string, imageId: string, actor: AuthenticatedUser): Promise<void> {
    const product = await this.findOrFail(productId);
    await this.assertCanManage(product, actor);

    const image = await this.imagesRepository.findOne({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found for this product');
    }

    await this.mediaService.deleteImage(image.publicId);
    await this.imagesRepository.delete(imageId);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 1;

    while (await this.productsRepository.findOne({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }

  /** Vendors (retail or wholesale) get their own approved vendor id as the product's owner; admins create platform (unowned) products. */
  private async resolveOwnVendorId(actor: AuthenticatedUser): Promise<string | null> {
    if (actor.role === UserRole.VENDOR || actor.role === UserRole.WHOLESALE_VENDOR) {
      return this.vendorsService.getApprovedVendorIdForUser(actor.id);
    }
    return null;
  }

  private async assertCanManage(product: Product, actor: AuthenticatedUser): Promise<void> {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return;
    }
    if (product.vendorId === null) {
      throw new ForbiddenException('Only a super admin can manage a platform-owned product');
    }

    const ownVendorId = await this.vendorsService.getApprovedVendorIdForUser(actor.id);
    if (product.vendorId !== ownVendorId) {
      throw new ForbiddenException('You do not have permission to manage this product');
    }
  }
}
