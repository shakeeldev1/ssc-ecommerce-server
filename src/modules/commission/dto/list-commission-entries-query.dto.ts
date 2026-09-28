import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { CommissionEntryStatus } from '@/modules/commission/enums/commission-entry-status.enum';

export class ListCommissionEntriesQueryDto {
  @ApiPropertyOptional({ enum: CommissionEntryStatus })
  @IsOptional()
  @IsEnum(CommissionEntryStatus)
  status?: CommissionEntryStatus;

  @ApiPropertyOptional({ enum: CommissionChannel })
  @IsOptional()
  @IsEnum(CommissionChannel)
  orderChannel?: CommissionChannel;

  @ApiPropertyOptional({ description: 'Admin listing only' })
  @IsOptional()
  @IsUUID()
  beneficiaryUserId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
