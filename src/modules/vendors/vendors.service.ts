import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { MediaService } from '@/modules/media/media.service';
import { OtpPurpose } from '@/modules/otp/enums/otp-purpose.enum';
import { OtpService } from '@/modules/otp/otp.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { UsersService } from '@/modules/users/users.service';
import { ApplyVendorDto } from '@/modules/vendors/dto/apply-vendor.dto';
import { UpdateVendorProfileDto } from '@/modules/vendors/dto/update-vendor-profile.dto';
import { VendorApplicationResponseDto } from '@/modules/vendors/dto/vendor-application-response.dto';
import { VendorDocument } from '@/modules/vendors/entities/vendor-document.entity';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';
import { VendorDocumentType } from '@/modules/vendors/enums/vendor-document-type.enum';
import { FeaturedVendor } from '@/modules/vendors/interfaces/featured-vendor.interface';
import {
  ALLOWED_VENDOR_STATUS_TRANSITIONS,
  VendorStatus,
} from '@/modules/vendors/enums/vendor-status.enum';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorsRepository: Repository<Vendor>,
    @InjectRepository(VendorDocument)
    private readonly documentsRepository: Repository<VendorDocument>,
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly auditLogService: AuditLogService,
    private readonly mediaService: MediaService,
  ) {}

  async apply(dto: ApplyVendorDto): Promise<VendorApplicationResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role ?? UserRole.VENDOR,
    });

    await this.vendorsRepository.save(
      this.vendorsRepository.create({
        userId: user.id,
        businessName: dto.businessName,
        businessType: dto.businessType ?? null,
        taxId: dto.taxId ?? null,
        contactPhone: dto.contactPhone,
        bankAccountName: dto.bankAccountName,
        bankAccountNumber: dto.bankAccountNumber,
        bankName: dto.bankName,
      }),
    );

    await this.auditLogService.record({
      actorUserId: user.id,
      action: 'vendor.apply',
      entityName: 'Vendor',
      entityId: user.id,
    });

    await this.otpService.requestOtp(user.email, OtpPurpose.EMAIL_VERIFICATION);

    return {
      email: user.email,
      message: 'Application submitted. An OTP has been sent to your email to verify it.',
    };
  }

  async getForUser(userId: string): Promise<Vendor> {
    const vendor = await this.vendorsRepository.findOne({
      where: { userId },
      relations: { documents: true },
    });
    if (!vendor) {
      throw new NotFoundException('No vendor application found for this account');
    }
    return vendor;
  }

  async findOrFail(id: string): Promise<Vendor> {
    const vendor = await this.vendorsRepository.findOne({
      where: { id },
      relations: { documents: true },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    return vendor;
  }

  /** A vendor edits their own business details (never their approval status). */
  async updateOwnProfile(userId: string, dto: UpdateVendorProfileDto): Promise<Vendor> {
    const vendor = await this.getForUser(userId);
    await this.vendorsRepository.update(vendor.id, { ...dto });
    return this.getForUser(userId);
  }

  /** Upload/replace the vendor's business logo (Cloudinary). */
  async updateLogo(userId: string, fileBuffer: Buffer): Promise<Vendor> {
    const vendor = await this.getForUser(userId);
    const uploaded = await this.mediaService.uploadImage(fileBuffer, 'vendor-logos');
    if (vendor.logoPublicId) {
      await this.mediaService.deleteImage(vendor.logoPublicId);
    }
    await this.vendorsRepository.update(vendor.id, {
      logoUrl: uploaded.url,
      logoPublicId: uploaded.publicId,
    });
    return this.getForUser(userId);
  }

  async list(status?: VendorStatus): Promise<Vendor[]> {
    return this.vendorsRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  /** Public — only ever the handful of fields safe to show on the storefront. */
  async listFeatured(limit: number): Promise<FeaturedVendor[]> {
    const vendors = await this.vendorsRepository.find({
      where: { status: VendorStatus.APPROVED },
      order: { approvedAt: 'DESC' },
      take: limit,
    });
    return vendors.map((vendor) => ({
      id: vendor.id,
      businessName: vendor.businessName,
      businessType: vendor.businessType,
    }));
  }

  async updateStatus(
    id: string,
    nextStatus: VendorStatus,
    actorUserId: string,
    reason?: string,
  ): Promise<Vendor> {
    const vendor = await this.findOrFail(id);
    const allowed = ALLOWED_VENDOR_STATUS_TRANSITIONS[vendor.status];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(`Cannot move a vendor from ${vendor.status} to ${nextStatus}`);
    }

    await this.vendorsRepository.update(id, {
      status: nextStatus,
      rejectionReason: nextStatus === VendorStatus.REJECTED ? (reason ?? null) : null,
      approvedAt: nextStatus === VendorStatus.APPROVED ? new Date() : vendor.approvedAt,
    });

    await this.auditLogService.record({
      actorUserId,
      action: `vendor.${nextStatus}`,
      entityName: 'Vendor',
      entityId: id,
      newValue: reason ? { reason } : null,
    });

    return this.findOrFail(id);
  }

  async addDocument(
    userId: string,
    type: VendorDocumentType,
    fileBuffer: Buffer,
  ): Promise<VendorDocument> {
    const vendor = await this.getForUser(userId);
    const uploaded = await this.mediaService.uploadImage(fileBuffer, 'vendor-documents');

    return this.documentsRepository.save(
      this.documentsRepository.create({
        vendorId: vendor.id,
        type,
        url: uploaded.url,
        publicId: uploaded.publicId,
      }),
    );
  }

  countApproved(): Promise<number> {
    return this.vendorsRepository.count({ where: { status: VendorStatus.APPROVED } });
  }

  /** Used by the catalog module to scope a vendor's product mutations to their own approved account. */
  async getApprovedVendorIdForUser(userId: string): Promise<string> {
    const vendor = await this.vendorsRepository.findOne({ where: { userId } });
    if (!vendor || vendor.status !== VendorStatus.APPROVED) {
      throw new ForbiddenException('Your vendor account is not approved to manage products yet');
    }
    return vendor.id;
  }
}
