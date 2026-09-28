import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { CreateProductVariantDto } from '@/modules/catalog/dto/create-product-variant.dto';
import { CreateProductDto } from '@/modules/catalog/dto/create-product.dto';
import { ListProductsQueryDto } from '@/modules/catalog/dto/list-products-query.dto';
import { UpdateProductVariantDto } from '@/modules/catalog/dto/update-product-variant.dto';
import { UpdateProductDto } from '@/modules/catalog/dto/update-product.dto';
import { ProductImage } from '@/modules/catalog/entities/product-image.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { Product } from '@/modules/catalog/entities/product.entity';
import { ProductsService } from '@/modules/catalog/products.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CATALOG_MANAGERS = [UserRole.SUPER_ADMIN, UserRole.VENDOR, UserRole.WHOLESALE_VENDOR];

@ApiTags('catalog-products')
@Controller('catalog/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse products (paginated, filterable)' })
  list(@Query() query: ListProductsQueryDto): Promise<PaginatedResult<Product>> {
    return this.productsService.list(query);
  }

  @Get('mine')
  @Roles(UserRole.VENDOR, UserRole.WHOLESALE_VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the current vendor's own products (including inactive ones)" })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<Product[]> {
    return this.productsService.listMine(user);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a product with its variants and images' })
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOrFail(id);
  }

  @ApiBearerAuth()
  @Roles(...CATALOG_MANAGERS)
  @Post()
  @ApiOperation({
    summary: 'Create a product (admin: platform product; vendor: their own listing)',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto, user);
  }

  @ApiBearerAuth()
  @Roles(...CATALOG_MANAGERS)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, dto, user);
  }

  @ApiBearerAuth()
  @Roles(...CATALOG_MANAGERS)
  @Post(':id/variants')
  @ApiOperation({ summary: 'Add a variant (SKU) to a product' })
  createVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') productId: string,
    @Body() dto: CreateProductVariantDto,
  ): Promise<ProductVariant> {
    return this.productsService.createVariant(productId, dto, user);
  }

  @ApiBearerAuth()
  @Roles(...CATALOG_MANAGERS)
  @Patch(':id/variants/:variantId')
  @ApiOperation({ summary: 'Update a variant' })
  updateVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ): Promise<ProductVariant> {
    return this.productsService.updateVariant(productId, variantId, dto, user);
  }

  @ApiBearerAuth()
  @Roles(...CATALOG_MANAGERS)
  @Post(':id/images')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add a gallery image to a product' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  async addImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') productId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ProductImage> {
    if (!file) {
      throw new BadRequestException('An "image" file is required');
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Image must be a JPEG, PNG or WEBP file');
    }
    return this.productsService.addImage(productId, file.buffer, user);
  }

  @ApiBearerAuth()
  @Roles(...CATALOG_MANAGERS)
  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a product image' })
  async removeImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') productId: string,
    @Param('imageId') imageId: string,
  ): Promise<void> {
    await this.productsService.removeImage(productId, imageId, user);
  }
}
