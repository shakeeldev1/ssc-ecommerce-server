import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ProductApprovalStatus } from '@/modules/catalog/enums/product-approval-status.enum';

/** Admins may only approve or reject (not reset to pending). */
const SETTABLE: readonly ProductApprovalStatus[] = [
  ProductApprovalStatus.APPROVED,
  ProductApprovalStatus.REJECTED,
];

export class UpdateProductApprovalDto {
  @ApiProperty({ enum: SETTABLE })
  @IsIn(SETTABLE as ProductApprovalStatus[])
  status: ProductApprovalStatus;

  @ApiPropertyOptional({ description: 'Reason shown to the vendor when rejecting.' })
  @ValidateIf((dto: UpdateProductApprovalDto) => dto.status === ProductApprovalStatus.REJECTED)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
