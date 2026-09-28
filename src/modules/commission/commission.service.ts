import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { Configuration } from '@/config/configuration';
import { Institution } from '@/modules/directory/entities/institution.entity';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';
import { CommissionEntry } from '@/modules/commission/entities/commission-entry.entity';
import { CommissionRule } from '@/modules/commission/entities/commission-rule.entity';
import {
  CommissionScopeType,
  HIERARCHY_SCOPE_TYPES_IN_ORDER,
} from '@/modules/commission/enums/commission-scope-type.enum';
import { CommissionRuleStatus } from '@/modules/commission/enums/commission-rule-status.enum';
import { CommissionEntryStatus } from '@/modules/commission/enums/commission-entry-status.enum';
import { CommissionType } from '@/modules/commission/enums/commission-type.enum';
import { ComputeCommissionInput } from '@/modules/commission/interfaces/compute-commission-input.interface';

interface HierarchyContext {
  institutionId: string | null;
  schoolChainId: string | null;
  districtId: string | null;
  regionId: string | null;
}

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly rulesRepository: Repository<CommissionRule>,
    @InjectRepository(CommissionEntry)
    private readonly entriesRepository: Repository<CommissionEntry>,
    @InjectRepository(StudentProfile)
    private readonly studentProfilesRepository: Repository<StudentProfile>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    private readonly configService: ConfigService<Configuration, true>,
  ) {}

  /**
   * Walks the school hierarchy (institution -> chain -> district -> region ->
   * head office) for the buyer, plus an independent campaign/affiliate-code
   * lane, creating one CommissionEntry per tier that has a matching rule.
   * Called once, right when an order is finalized — reversal on cancel/
   * return is Phase 7's job, not this one.
   */
  async computeForOrder(input: ComputeCommissionInput): Promise<CommissionEntry[]> {
    const context = await this.resolveHierarchyContext(input.buyerUserId);
    const entries: CommissionEntry[] = [];

    for (const scopeType of HIERARCHY_SCOPE_TYPES_IN_ORDER) {
      const scopeId = this.contextIdForScope(scopeType, context);
      if (scopeType !== CommissionScopeType.GLOBAL && !scopeId) {
        continue;
      }

      const rule = await this.findBestRule(scopeType, scopeId, input.channel);
      if (rule) {
        entries.push(await this.recordEntry(rule, input));
      }
    }

    if (input.campaignCode) {
      const rule = await this.findBestCampaignRule(input.campaignCode, input.channel);
      if (rule) {
        entries.push(await this.recordEntry(rule, input));
      }
    }

    return entries;
  }

  private async resolveHierarchyContext(buyerUserId: string): Promise<HierarchyContext> {
    const profile = await this.studentProfilesRepository.findOne({
      where: { userId: buyerUserId },
    });
    if (!profile) {
      return { institutionId: null, schoolChainId: null, districtId: null, regionId: null };
    }

    let schoolChainId: string | null = null;
    if (profile.institutionId) {
      const institution = await this.institutionsRepository.findOne({
        where: { id: profile.institutionId },
      });
      schoolChainId = institution?.schoolChainId ?? null;
    }

    return {
      institutionId: profile.institutionId,
      schoolChainId,
      districtId: profile.districtId,
      regionId: profile.regionId,
    };
  }

  private contextIdForScope(
    scopeType: CommissionScopeType,
    context: HierarchyContext,
  ): string | null {
    switch (scopeType) {
      case CommissionScopeType.INSTITUTION:
        return context.institutionId;
      case CommissionScopeType.SCHOOL_CHAIN:
        return context.schoolChainId;
      case CommissionScopeType.DISTRICT:
        return context.districtId;
      case CommissionScopeType.REGION:
        return context.regionId;
      case CommissionScopeType.GLOBAL:
      default:
        return null;
    }
  }

  private async findBestRule(
    scopeType: CommissionScopeType,
    scopeId: string | null,
    channel: ComputeCommissionInput['channel'],
  ): Promise<CommissionRule | null> {
    const scopeIdCondition = scopeId === null ? IsNull() : scopeId;
    const matches = await this.rulesRepository.find({
      where: [
        {
          scopeType,
          scopeId: scopeIdCondition,
          channel,
          status: Not(CommissionRuleStatus.DISABLED),
        },
        {
          scopeType,
          scopeId: scopeIdCondition,
          channel: IsNull(),
          status: Not(CommissionRuleStatus.DISABLED),
        },
      ],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
    return matches[0] ?? null;
  }

  private async findBestCampaignRule(
    campaignCode: string,
    channel: ComputeCommissionInput['channel'],
  ): Promise<CommissionRule | null> {
    const matches = await this.rulesRepository.find({
      where: [
        {
          scopeType: CommissionScopeType.CAMPAIGN,
          campaignCode,
          channel,
          status: Not(CommissionRuleStatus.DISABLED),
        },
        {
          scopeType: CommissionScopeType.CAMPAIGN,
          campaignCode,
          channel: IsNull(),
          status: Not(CommissionRuleStatus.DISABLED),
        },
      ],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
    return matches[0] ?? null;
  }

  private async recordEntry(
    rule: CommissionRule,
    input: ComputeCommissionInput,
  ): Promise<CommissionEntry> {
    const amount = this.computeAmount(rule, input.totalAmount);

    let status: CommissionEntryStatus;
    let holdUntil: Date | null = null;
    if (rule.status === CommissionRuleStatus.ZEROED) {
      status = CommissionEntryStatus.ZEROED;
    } else if (rule.status === CommissionRuleStatus.ON_HOLD) {
      // Manually held by the rule itself — stays held until an admin changes the rule, no auto-release.
      status = CommissionEntryStatus.HELD;
    } else {
      // Normal case: held for the return window, then lazily released to EARNED (see releaseElapsedHolds).
      status = CommissionEntryStatus.HELD;
      const holdWindowDays = this.configService.get('commission', { infer: true }).holdWindowDays;
      holdUntil = new Date(Date.now() + holdWindowDays * 24 * 60 * 60 * 1000);
    }

    return this.entriesRepository.save(
      this.entriesRepository.create({
        ruleId: rule.id,
        beneficiaryUserId: rule.beneficiaryUserId,
        orderChannel: input.channel,
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        scopeType: rule.scopeType,
        baseAmount: input.totalAmount,
        type: rule.type,
        value: rule.value,
        amount,
        status,
        holdUntil,
      }),
    );
  }

  /**
   * Releases entries whose return-window hold has elapsed back to EARNED —
   * lazy, checked on read (see CommissionEntriesService), mirroring the
   * stock-reservation/quotation expiry pattern used elsewhere in this app.
   */
  async releaseElapsedHolds(): Promise<void> {
    await this.entriesRepository.update(
      {
        status: CommissionEntryStatus.HELD,
        holdUntil: LessThanOrEqual(new Date()),
      },
      { status: CommissionEntryStatus.EARNED, holdUntil: null },
    );
  }

  /** Reverses every not-yet-reversed entry for an order — called when it's cancelled or returned. */
  async reverseForOrder(orderId: string): Promise<void> {
    await this.entriesRepository.update(
      { orderId, status: In([CommissionEntryStatus.HELD, CommissionEntryStatus.EARNED]) },
      { status: CommissionEntryStatus.REVERSED, holdUntil: null },
    );
  }

  private computeAmount(rule: CommissionRule, baseAmount: number): number {
    if (rule.status === CommissionRuleStatus.ZEROED) {
      return 0;
    }

    let amount =
      rule.type === CommissionType.PERCENTAGE ? (baseAmount * rule.value) / 100 : rule.value;
    if (rule.maxAmount !== null) {
      amount = Math.min(amount, rule.maxAmount);
    }
    if (rule.minAmount !== null) {
      amount = Math.max(amount, rule.minAmount);
    }
    return amount;
  }
}
