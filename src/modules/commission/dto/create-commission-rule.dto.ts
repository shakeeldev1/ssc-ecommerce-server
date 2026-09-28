import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { CommissionScopeType } from '@/modules/commission/enums/commission-scope-type.enum';
import { CommissionType } from '@/modules/commission/enums/commission-type.enum';

export class CreateCommissionRuleDto {
  @ApiProperty({ example: 'Lahore district standard rate' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'The user who gets paid when this rule matches' })
  @IsUUID()
  beneficiaryUserId: string;

  @ApiProperty({ enum: CommissionScopeType })
  @IsEnum(CommissionScopeType)
  scopeType: CommissionScopeType;

  @ApiPropertyOptional({
    description:
      'Region/District/Institution/SchoolChain id — required for every scopeType except GLOBAL and CAMPAIGN',
  })
  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @ApiPropertyOptional({ description: 'Required (and only used) when scopeType is CAMPAIGN' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  campaignCode?: string;

  @ApiPropertyOptional({ enum: CommissionChannel, description: 'Omit to apply to both channels' })
  @IsOptional()
  @IsEnum(CommissionChannel)
  channel?: CommissionChannel;

  @ApiProperty({ enum: CommissionType })
  @IsEnum(CommissionType)
  type: CommissionType;

  @ApiProperty({ example: 5, description: 'Percentage points (0-100) or a fixed amount' })
  @IsPositive()
  value: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  maxAmount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
