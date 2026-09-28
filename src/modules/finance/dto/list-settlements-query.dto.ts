import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SettlementStatus } from '@/modules/finance/enums/settlement-status.enum';

export class ListSettlementsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  beneficiaryUserId?: string;

  @ApiPropertyOptional({ enum: SettlementStatus })
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;
}
