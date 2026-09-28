import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCommissionRuleDto } from '@/modules/commission/dto/create-commission-rule.dto';
import { CommissionRuleStatus } from '@/modules/commission/enums/commission-rule-status.enum';

export class UpdateCommissionRuleDto extends PartialType(CreateCommissionRuleDto) {
  @ApiPropertyOptional({ enum: CommissionRuleStatus })
  @IsOptional()
  @IsEnum(CommissionRuleStatus)
  status?: CommissionRuleStatus;
}
