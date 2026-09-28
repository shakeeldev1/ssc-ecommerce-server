import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VendorStatus } from '@/modules/vendors/enums/vendor-status.enum';

export class UpdateVendorStatusDto {
  @ApiProperty({ enum: VendorStatus })
  @IsEnum(VendorStatus)
  status: VendorStatus;

  @ApiPropertyOptional({ description: 'Required in practice when rejecting an application' })
  @IsOptional()
  @IsString()
  reason?: string;
}
