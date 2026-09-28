import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { DirectoryService } from '@/modules/directory/directory.service';
import { CreateDistrictDto } from '@/modules/directory/dto/create-district.dto';
import { CreateInstitutionDto } from '@/modules/directory/dto/create-institution.dto';
import { CreateRegionDto } from '@/modules/directory/dto/create-region.dto';
import { CreateSchoolChainDto } from '@/modules/directory/dto/create-school-chain.dto';
import { ListDistrictsQueryDto } from '@/modules/directory/dto/list-districts-query.dto';
import { ListInstitutionsQueryDto } from '@/modules/directory/dto/list-institutions-query.dto';
import { District } from '@/modules/directory/entities/district.entity';
import { Institution } from '@/modules/directory/entities/institution.entity';
import { Region } from '@/modules/directory/entities/region.entity';
import { SchoolChain } from '@/modules/directory/entities/school-chain.entity';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('directory')
@Controller()
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Post('regions')
  @ApiOperation({ summary: 'Create a region' })
  createRegion(@Body() dto: CreateRegionDto): Promise<Region> {
    return this.directoryService.createRegion(dto);
  }

  @Public()
  @Get('regions')
  @ApiOperation({ summary: 'List all regions' })
  listRegions(): Promise<Region[]> {
    return this.directoryService.listRegions();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('districts')
  @ApiOperation({ summary: 'Create a district within a region' })
  createDistrict(@Body() dto: CreateDistrictDto): Promise<District> {
    return this.directoryService.createDistrict(dto);
  }

  @Public()
  @Get('districts')
  @ApiOperation({ summary: 'List districts, optionally filtered by region' })
  listDistricts(@Query() query: ListDistrictsQueryDto): Promise<District[]> {
    return this.directoryService.listDistricts(query.regionId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('institutions')
  @ApiOperation({ summary: 'Create an institution (school/college/university) within a district' })
  createInstitution(@Body() dto: CreateInstitutionDto): Promise<Institution> {
    return this.directoryService.createInstitution(dto);
  }

  @Public()
  @Get('institutions')
  @ApiOperation({ summary: 'List institutions, optionally filtered by district' })
  listInstitutions(@Query() query: ListInstitutionsQueryDto): Promise<Institution[]> {
    return this.directoryService.listInstitutions(query.districtId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('school-chains')
  @ApiOperation({ summary: 'Create a school chain (groups institutions for commission routing)' })
  createSchoolChain(@Body() dto: CreateSchoolChainDto): Promise<SchoolChain> {
    return this.directoryService.createSchoolChain(dto);
  }

  @Public()
  @Get('school-chains')
  @ApiOperation({ summary: 'List all school chains' })
  listSchoolChains(): Promise<SchoolChain[]> {
    return this.directoryService.listSchoolChains();
  }
}
