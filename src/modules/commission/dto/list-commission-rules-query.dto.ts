import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { CommissionRuleStatus } from '@/modules/commission/enums/commission-rule-status.enum';
import { CommissionScopeType } from '@/modules/commission/enums/commission-scope-type.enum';

export class ListCommissionRulesQueryDto {
  @ApiPropertyOptional({ enum: CommissionScopeType })
  @IsOptional()
  @IsEnum(CommissionScopeType)
  scopeType?: CommissionScopeType;

  @ApiPropertyOptional({ enum: CommissionRuleStatus })
  @IsOptional()
  @IsEnum(CommissionRuleStatus)
  status?: CommissionRuleStatus;

  @ApiPropertyOptional({ enum: CommissionChannel })
  @IsOptional()
  @IsEnum(CommissionChannel)
  channel?: CommissionChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  beneficiaryUserId?: string;
}
