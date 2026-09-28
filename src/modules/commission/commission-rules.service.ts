import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { District } from '@/modules/directory/entities/district.entity';
import { Institution } from '@/modules/directory/entities/institution.entity';
import { Region } from '@/modules/directory/entities/region.entity';
import { SchoolChain } from '@/modules/directory/entities/school-chain.entity';
import { UsersService } from '@/modules/users/users.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CreateCommissionRuleDto } from '@/modules/commission/dto/create-commission-rule.dto';
import { ListCommissionRulesQueryDto } from '@/modules/commission/dto/list-commission-rules-query.dto';
import { UpdateCommissionRuleDto } from '@/modules/commission/dto/update-commission-rule.dto';
import { CommissionRule } from '@/modules/commission/entities/commission-rule.entity';
import { CommissionScopeType } from '@/modules/commission/enums/commission-scope-type.enum';
import { CommissionType } from '@/modules/commission/enums/commission-type.enum';

/** The rule fields worth capturing in the audit trail (before/after). */
const snapshotRule = (rule: CommissionRule): Record<string, unknown> => ({
  name: rule.name,
  beneficiaryUserId: rule.beneficiaryUserId,
  scopeType: rule.scopeType,
  scopeId: rule.scopeId,
  campaignCode: rule.campaignCode,
  channel: rule.channel,
  type: rule.type,
  value: rule.value,
  minAmount: rule.minAmount,
  maxAmount: rule.maxAmount,
  priority: rule.priority,
  status: rule.status,
});

@Injectable()
export class CommissionRulesService {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly rulesRepository: Repository<CommissionRule>,
    @InjectRepository(Region)
    private readonly regionsRepository: Repository<Region>,
    @InjectRepository(District)
    private readonly districtsRepository: Repository<District>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    @InjectRepository(SchoolChain)
    private readonly schoolChainsRepository: Repository<SchoolChain>,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateCommissionRuleDto, actorUserId: string): Promise<CommissionRule> {
    await this.usersService.findById(dto.beneficiaryUserId);
    await this.assertScopeIsValid(dto.scopeType, dto.scopeId, dto.campaignCode);
    this.assertValueIsValid(dto.type, dto.value);

    const rule = await this.rulesRepository.save(
      this.rulesRepository.create({
        name: dto.name,
        beneficiaryUserId: dto.beneficiaryUserId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeType === CommissionScopeType.CAMPAIGN ? null : (dto.scopeId ?? null),
        campaignCode:
          dto.scopeType === CommissionScopeType.CAMPAIGN ? (dto.campaignCode ?? null) : null,
        channel: dto.channel ?? null,
        type: dto.type,
        value: dto.value,
        minAmount: dto.minAmount ?? null,
        maxAmount: dto.maxAmount ?? null,
        priority: dto.priority ?? 0,
      }),
    );

    await this.auditLogService.record({
      actorUserId,
      action: 'commission_rule.created',
      entityName: 'CommissionRule',
      entityId: rule.id,
      newValue: snapshotRule(rule),
    });
    return rule;
  }

  async update(
    id: string,
    dto: UpdateCommissionRuleDto,
    actorUserId: string,
  ): Promise<CommissionRule> {
    const rule = await this.findOrFail(id);

    if (dto.beneficiaryUserId) {
      await this.usersService.findById(dto.beneficiaryUserId);
    }
    const nextScopeType = dto.scopeType ?? rule.scopeType;
    if (dto.scopeType || dto.scopeId !== undefined || dto.campaignCode !== undefined) {
      await this.assertScopeIsValid(
        nextScopeType,
        dto.scopeId ?? rule.scopeId ?? undefined,
        dto.campaignCode ?? rule.campaignCode ?? undefined,
      );
    }
    if (dto.type || dto.value !== undefined) {
      this.assertValueIsValid(dto.type ?? rule.type, dto.value ?? rule.value);
    }

    await this.rulesRepository.update(id, {
      name: dto.name,
      beneficiaryUserId: dto.beneficiaryUserId,
      scopeType: dto.scopeType,
      scopeId: nextScopeType === CommissionScopeType.CAMPAIGN ? null : dto.scopeId,
      campaignCode: nextScopeType === CommissionScopeType.CAMPAIGN ? dto.campaignCode : undefined,
      channel: dto.channel,
      type: dto.type,
      value: dto.value,
      minAmount: dto.minAmount,
      maxAmount: dto.maxAmount,
      priority: dto.priority,
      status: dto.status,
    });
    const updated = await this.findOrFail(id);

    await this.auditLogService.record({
      actorUserId,
      action: 'commission_rule.updated',
      entityName: 'CommissionRule',
      entityId: id,
      previousValue: snapshotRule(rule),
      newValue: snapshotRule(updated),
    });
    return updated;
  }

  async list(query: ListCommissionRulesQueryDto): Promise<CommissionRule[]> {
    const where: FindOptionsWhere<CommissionRule> = {};
    if (query.scopeType) where.scopeType = query.scopeType;
    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;
    if (query.beneficiaryUserId) where.beneficiaryUserId = query.beneficiaryUserId;

    return this.rulesRepository.find({
      where,
      relations: { beneficiary: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOrFail(id: string): Promise<CommissionRule> {
    const rule = await this.rulesRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Commission rule not found');
    }
    return rule;
  }

  private async assertScopeIsValid(
    scopeType: CommissionScopeType,
    scopeId?: string,
    campaignCode?: string,
  ): Promise<void> {
    if (scopeType === CommissionScopeType.CAMPAIGN) {
      if (!campaignCode) {
        throw new BadRequestException('campaignCode is required when scopeType is CAMPAIGN');
      }
      return;
    }
    if (scopeType === CommissionScopeType.GLOBAL) {
      return;
    }

    if (!scopeId) {
      throw new BadRequestException(`scopeId is required for scopeType "${scopeType}"`);
    }

    const repository = {
      [CommissionScopeType.REGION]: this.regionsRepository,
      [CommissionScopeType.DISTRICT]: this.districtsRepository,
      [CommissionScopeType.INSTITUTION]: this.institutionsRepository,
      [CommissionScopeType.SCHOOL_CHAIN]: this.schoolChainsRepository,
    }[scopeType];

    const found = await repository.findOne({ where: { id: scopeId } });
    if (!found) {
      throw new BadRequestException(`No ${scopeType} found with id "${scopeId}"`);
    }
  }

  private assertValueIsValid(type: CommissionType, value: number): void {
    if (type === CommissionType.PERCENTAGE && value > 100) {
      throw new BadRequestException('A percentage commission value cannot exceed 100');
    }
  }
}
