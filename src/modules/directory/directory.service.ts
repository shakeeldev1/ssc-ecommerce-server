import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDistrictDto } from '@/modules/directory/dto/create-district.dto';
import { CreateInstitutionDto } from '@/modules/directory/dto/create-institution.dto';
import { CreateRegionDto } from '@/modules/directory/dto/create-region.dto';
import { CreateSchoolChainDto } from '@/modules/directory/dto/create-school-chain.dto';
import { District } from '@/modules/directory/entities/district.entity';
import { Institution } from '@/modules/directory/entities/institution.entity';
import { Region } from '@/modules/directory/entities/region.entity';
import { SchoolChain } from '@/modules/directory/entities/school-chain.entity';

@Injectable()
export class DirectoryService {
  constructor(
    @InjectRepository(Region)
    private readonly regionsRepository: Repository<Region>,
    @InjectRepository(District)
    private readonly districtsRepository: Repository<District>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    @InjectRepository(SchoolChain)
    private readonly schoolChainsRepository: Repository<SchoolChain>,
  ) {}

  createRegion(dto: CreateRegionDto): Promise<Region> {
    return this.regionsRepository.save(this.regionsRepository.create(dto));
  }

  listRegions(): Promise<Region[]> {
    return this.regionsRepository.find({ order: { name: 'ASC' } });
  }

  async createDistrict(dto: CreateDistrictDto): Promise<District> {
    await this.getRegionOrFail(dto.regionId);
    return this.districtsRepository.save(this.districtsRepository.create(dto));
  }

  listDistricts(regionId?: string): Promise<District[]> {
    return this.districtsRepository.find({
      where: regionId ? { regionId } : {},
      order: { name: 'ASC' },
    });
  }

  async createInstitution(dto: CreateInstitutionDto): Promise<Institution> {
    await this.getDistrictOrFail(dto.districtId);
    if (dto.schoolChainId) {
      await this.getSchoolChainOrFail(dto.schoolChainId);
    }
    return this.institutionsRepository.save(this.institutionsRepository.create(dto));
  }

  listInstitutions(districtId?: string): Promise<Institution[]> {
    return this.institutionsRepository.find({
      where: districtId ? { districtId } : {},
      order: { name: 'ASC' },
    });
  }

  countInstitutions(): Promise<number> {
    return this.institutionsRepository.count();
  }

  createSchoolChain(dto: CreateSchoolChainDto): Promise<SchoolChain> {
    return this.schoolChainsRepository.save(this.schoolChainsRepository.create(dto));
  }

  listSchoolChains(): Promise<SchoolChain[]> {
    return this.schoolChainsRepository.find({ order: { name: 'ASC' } });
  }

  async getSchoolChainOrFail(id: string): Promise<SchoolChain> {
    const schoolChain = await this.schoolChainsRepository.findOne({ where: { id } });
    if (!schoolChain) {
      throw new NotFoundException('School chain not found');
    }
    return schoolChain;
  }

  async getInstitutionOrFail(id: string): Promise<Institution> {
    const institution = await this.institutionsRepository.findOne({ where: { id } });
    if (!institution) {
      throw new NotFoundException('Institution not found');
    }
    return institution;
  }

  async getDistrictOrFail(id: string): Promise<District> {
    const district = await this.districtsRepository.findOne({ where: { id } });
    if (!district) {
      throw new NotFoundException('District not found');
    }
    return district;
  }

  async getRegionOrFail(id: string): Promise<Region> {
    const region = await this.regionsRepository.findOne({ where: { id } });
    if (!region) {
      throw new NotFoundException('Region not found');
    }
    return region;
  }
}
