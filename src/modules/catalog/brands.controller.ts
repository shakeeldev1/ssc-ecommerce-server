import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { BrandsService } from '@/modules/catalog/brands.service';
import { CreateBrandDto } from '@/modules/catalog/dto/create-brand.dto';
import { UpdateBrandDto } from '@/modules/catalog/dto/update-brand.dto';
import { Brand } from '@/modules/catalog/entities/brand.entity';
import { UserRole } from '@/modules/users/enums/user-role.enum';

const MAX_LOGO_SIZE_BYTES = 3 * 1024 * 1024;

@ApiTags('catalog-brands')
@Controller('catalog/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all brands' })
  list(): Promise<Brand[]> {
    return this.brandsService.list();
  }

  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a brand' })
  create(@Body() dto: CreateBrandDto): Promise<Brand> {
    return this.brandsService.create(dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a brand' })
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto): Promise<Brand> {
    return this.brandsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @Post(':id/logo')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload/replace the brand logo' })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LOGO_SIZE_BYTES },
    }),
  )
  uploadLogo(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File): Promise<Brand> {
    if (!file) {
      throw new BadRequestException('A "logo" file is required');
    }
    return this.brandsService.uploadLogo(id, file.buffer);
  }
}
