import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { ListWholesaleVariantsQueryDto } from '@/modules/wholesale/dto/list-wholesale-variants-query.dto';

const VARIANT_RELATIONS = { product: { category: true, brand: true } };

@Injectable()
export class WholesaleCatalogueService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
  ) {}

  /** The wholesale storefront: only variants a vendor has explicitly opened up for bulk/RFQ purchase. */
  async browse(query: ListWholesaleVariantsQueryDto): Promise<PaginatedResult<ProductVariant>> {
    const where: FindOptionsWhere<ProductVariant> = {
      isWholesaleEligible: true,
      isActive: true,
    };
    if (query.categoryId || query.brandId || query.search) {
      where.product = {
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.brandId ? { brandId: query.brandId } : {}),
        ...(query.search ? { name: ILike(`%${query.search}%`) } : {}),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.variantsRepository.findAndCount({
      where,
      relations: VARIANT_RELATIONS,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
}
