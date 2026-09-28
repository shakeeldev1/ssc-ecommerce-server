import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ReturnRequestStatus } from '@/modules/returns/enums/return-request-status.enum';

export class DecideReturnRequestDto {
  @ApiProperty({ enum: [ReturnRequestStatus.APPROVED, ReturnRequestStatus.REJECTED] })
  @IsIn([ReturnRequestStatus.APPROVED, ReturnRequestStatus.REJECTED])
  decision: ReturnRequestStatus.APPROVED | ReturnRequestStatus.REJECTED;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
