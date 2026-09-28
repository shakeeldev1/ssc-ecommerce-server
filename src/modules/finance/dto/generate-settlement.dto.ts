import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class GenerateSettlementDto {
  @ApiProperty()
  @IsUUID()
  beneficiaryUserId: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  periodEnd: string;
}
