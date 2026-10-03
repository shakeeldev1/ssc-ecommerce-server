import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { ApplyVendorDto } from '@/modules/vendors/dto/apply-vendor.dto';
import { UpdateVendorProfileDto } from '@/modules/vendors/dto/update-vendor-profile.dto';
import { UpdateVendorStatusDto } from '@/modules/vendors/dto/update-vendor-status.dto';
import { VendorApplicationResponseDto } from '@/modules/vendors/dto/vendor-application-response.dto';
import { VendorDocument } from '@/modules/vendors/entities/vendor-document.entity';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';
import { VendorDocumentType } from '@/modules/vendors/enums/vendor-document-type.enum';
import { VendorStatus } from '@/modules/vendors/enums/vendor-status.enum';
import { FeaturedVendor } from '@/modules/vendors/interfaces/featured-vendor.interface';
import { VendorsService } from '@/modules/vendors/vendors.service';

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Public()
  @Post('apply')
  @ApiOperation({ summary: 'Apply to become a vendor (creates the account and sends an OTP)' })
  apply(@Body() dto: ApplyVendorDto): Promise<VendorApplicationResponseDto> {
    return this.vendorsService.apply(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current user's vendor application/profile" })
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<Vendor> {
    return this.vendorsService.getForUser(user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR, UserRole.WHOLESALE_VENDOR)
  @ApiOperation({ summary: 'Update your own vendor business details' })
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateVendorProfileDto,
  ): Promise<Vendor> {
    return this.vendorsService.updateOwnProfile(user.id, dto);
  }

  @Post('me/logo')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR, UserRole.WHOLESALE_VENDOR)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or replace your business logo' })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
    }),
  )
  async updateLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Vendor> {
    if (!file) {
      throw new BadRequestException('A "logo" file is required');
    }
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Logo must be a JPEG, PNG or WEBP image');
    }
    return this.vendorsService.updateLogo(user.id, file.buffer);
  }

  @Post('me/documents')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a verification document (business registration, tax cert, etc.)',
  })
  @UseInterceptors(
    FileInterceptor('document', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
    }),
  )
  async addDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body('type') type: VendorDocumentType,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<VendorDocument> {
    if (!file) {
      throw new BadRequestException('A "document" file is required');
    }
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Document must be a JPEG, PNG or WEBP image');
    }
    if (!Object.values(VendorDocumentType).includes(type)) {
      throw new BadRequestException('Invalid document type');
    }
    return this.vendorsService.addDocument(user.id, type, file.buffer);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', enum: VendorStatus, required: false })
  @ApiOperation({ summary: 'List vendor applications, optionally filtered by status' })
  list(@Query('status') status?: VendorStatus): Promise<Vendor[]> {
    return this.vendorsService.list(status);
  }

  @Public()
  @Get('featured')
  @ApiOperation({
    summary: 'A handful of approved vendors for the storefront (name only, no sensitive data)',
  })
  listFeatured(@Query('limit') limit?: string): Promise<FeaturedVendor[]> {
    const parsed = Number(limit);
    return this.vendorsService.listFeatured(Number.isFinite(parsed) && parsed > 0 ? parsed : 8);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one vendor application (with documents)' })
  findOne(@Param('id') id: string): Promise<Vendor> {
    return this.vendorsService.findOrFail(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve, reject, suspend, block or deactivate a vendor' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateVendorStatusDto,
  ): Promise<Vendor> {
    return this.vendorsService.updateStatus(id, dto.status, user.id, dto.reason);
  }
}
