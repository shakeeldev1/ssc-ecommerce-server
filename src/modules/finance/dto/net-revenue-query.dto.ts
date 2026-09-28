import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class NetRevenueQueryDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  endDate: string;
}
