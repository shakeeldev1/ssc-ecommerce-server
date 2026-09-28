import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { slugify } from '@/common/utils/slug.util';
import { Category } from '@/modules/catalog/entities/category.entity';
import { CreateCategoryDto } from '@/modules/catalog/dto/create-category.dto';
import { UpdateCategoryDto } from '@/modules/catalog/dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    if (dto.parentId) {
      await this.findOrFail(dto.parentId);
    }

    const category = this.categoriesRepository.create({
      name: dto.name,
      parentId: dto.parentId ?? null,
      slug: await this.generateUniqueSlug(dto.name),
    });
    return this.categoriesRepository.save(category);
  }

  list(parentId?: string): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: parentId ? { parentId } : {},
      order: { name: 'ASC' },
    });
  }

  async findOrFail(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findOrFail(id);
    if (dto.parentId) {
      await this.findOrFail(dto.parentId);
    }
    await this.categoriesRepository.update(id, dto);
    return this.findOrFail(id);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 1;

    while (await this.categoriesRepository.findOne({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }
}
