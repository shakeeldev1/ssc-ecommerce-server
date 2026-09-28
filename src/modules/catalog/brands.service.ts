import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '@/modules/catalog/entities/brand.entity';
import { CreateBrandDto } from '@/modules/catalog/dto/create-brand.dto';
import { UpdateBrandDto } from '@/modules/catalog/dto/update-brand.dto';
import { MediaService } from '@/modules/media/media.service';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
    private readonly mediaService: MediaService,
  ) {}

  create(dto: CreateBrandDto): Promise<Brand> {
    return this.brandsRepository.save(this.brandsRepository.create(dto));
  }

  list(): Promise<Brand[]> {
    return this.brandsRepository.find({ order: { name: 'ASC' } });
  }

  async findOrFail(id: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    await this.findOrFail(id);
    await this.brandsRepository.update(id, dto);
    return this.findOrFail(id);
  }

  async uploadLogo(id: string, fileBuffer: Buffer): Promise<Brand> {
    const brand = await this.findOrFail(id);
    const uploaded = await this.mediaService.uploadImage(fileBuffer, 'brand-logos');

    if (brand.logoPublicId) {
      await this.mediaService.deleteImage(brand.logoPublicId);
    }

    await this.brandsRepository.update(id, {
      logoUrl: uploaded.url,
      logoPublicId: uploaded.publicId,
    });
    return this.findOrFail(id);
  }
}
