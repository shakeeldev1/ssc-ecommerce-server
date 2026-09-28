import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CategoriesService } from '@/modules/catalog/categories.service';
import { CreateCategoryDto } from '@/modules/catalog/dto/create-category.dto';
import { UpdateCategoryDto } from '@/modules/catalog/dto/update-category.dto';
import { Category } from '@/modules/catalog/entities/category.entity';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('catalog-categories')
@Controller('catalog/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List categories, optionally filtered by parent (omit for top-level)' })
  list(@Query('parentId') parentId?: string): Promise<Category[]> {
    return this.categoriesService.list(parentId);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a category or subcategory' })
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<Category> {
    return this.categoriesService.update(id, dto);
  }
}
