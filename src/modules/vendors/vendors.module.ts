import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { MediaModule } from '@/modules/media/media.module';
import { OtpModule } from '@/modules/otp/otp.module';
import { UsersModule } from '@/modules/users/users.module';
import { VendorDocument } from '@/modules/vendors/entities/vendor-document.entity';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';
import { VendorsController } from '@/modules/vendors/vendors.controller';
import { VendorsService } from '@/modules/vendors/vendors.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, VendorDocument]),
    UsersModule,
    OtpModule,
    MediaModule,
    AuditLogModule,
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
