import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { CommissionRulesService } from '@/modules/commission/commission-rules.service';
import { CreateCommissionRuleDto } from '@/modules/commission/dto/create-commission-rule.dto';
import { ListCommissionRulesQueryDto } from '@/modules/commission/dto/list-commission-rules-query.dto';
import { UpdateCommissionRuleDto } from '@/modules/commission/dto/update-commission-rule.dto';
import { CommissionRule } from '@/modules/commission/entities/commission-rule.entity';

@ApiTags('commission')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('commission/rules')
export class CommissionRulesController {
  constructor(private readonly rulesService: CommissionRulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a commission rule (hierarchy tier or campaign/affiliate code)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommissionRuleDto,
  ): Promise<CommissionRule> {
    return this.rulesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List commission rules, optionally filtered' })
  list(@Query() query: ListCommissionRulesQueryDto): Promise<CommissionRule[]> {
    return this.rulesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one commission rule' })
  findOne(@Param('id') id: string): Promise<CommissionRule> {
    return this.rulesService.findOrFail(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a commission rule, including enable/disable/hold/zero via status',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRule> {
    return this.rulesService.update(id, dto, user.id);
  }
}
