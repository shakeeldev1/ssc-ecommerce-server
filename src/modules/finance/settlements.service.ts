import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CommissionService } from '@/modules/commission/commission.service';
import { CommissionEntry } from '@/modules/commission/entities/commission-entry.entity';
import { CommissionEntryStatus } from '@/modules/commission/enums/commission-entry-status.enum';
import { GenerateSettlementDto } from '@/modules/finance/dto/generate-settlement.dto';
import { ListSettlementsQueryDto } from '@/modules/finance/dto/list-settlements-query.dto';
import { SettlementStatement } from '@/modules/finance/entities/settlement-statement.entity';
import { SettlementStatus } from '@/modules/finance/enums/settlement-status.enum';

@Injectable()
export class SettlementsService {
  constructor(
    @InjectRepository(SettlementStatement)
    private readonly statementsRepository: Repository<SettlementStatement>,
    @InjectRepository(CommissionEntry)
    private readonly entriesRepository: Repository<CommissionEntry>,
    private readonly commissionService: CommissionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async generate(dto: GenerateSettlementDto, actorUserId: string): Promise<SettlementStatement> {
    if (dto.periodEnd < dto.periodStart) {
      throw new BadRequestException('periodEnd cannot be before periodStart');
    }

    // Release anything that just crossed the return-window hold so this statement includes it.
    await this.commissionService.releaseElapsedHolds();

    const periodEndExclusive = new Date(dto.periodEnd);
    periodEndExclusive.setDate(periodEndExclusive.getDate() + 1);

    const entries = await this.entriesRepository.find({
      where: {
        beneficiaryUserId: dto.beneficiaryUserId,
        status: CommissionEntryStatus.EARNED,
        settlementStatementId: IsNull(),
        createdAt: Between(new Date(dto.periodStart), periodEndExclusive),
      },
    });

    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

    const statement = await this.statementsRepository.save(
      this.statementsRepository.create({
        beneficiaryUserId: dto.beneficiaryUserId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        totalAmount,
        entryCount: entries.length,
      }),
    );

    if (entries.length > 0) {
      await this.entriesRepository.update(
        { id: In(entries.map((entry) => entry.id)) },
        { settlementStatementId: statement.id },
      );
    }

    await this.auditLogService.record({
      actorUserId,
      action: 'settlement.generated',
      entityName: 'SettlementStatement',
      entityId: statement.id,
      newValue: {
        beneficiaryUserId: statement.beneficiaryUserId,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        totalAmount: statement.totalAmount,
        entryCount: statement.entryCount,
      },
    });

    return statement;
  }

  async markPaid(id: string, actorUserId: string): Promise<SettlementStatement> {
    const statement = await this.findOrFail(id);
    if (statement.status === SettlementStatus.PAID) {
      throw new BadRequestException('This statement has already been marked paid');
    }
    await this.statementsRepository.update(id, {
      status: SettlementStatus.PAID,
      paidAt: new Date(),
    });

    await this.auditLogService.record({
      actorUserId,
      action: 'settlement.marked_paid',
      entityName: 'SettlementStatement',
      entityId: id,
      previousValue: { status: statement.status },
      newValue: { status: SettlementStatus.PAID, totalAmount: statement.totalAmount },
    });

    return this.findOrFail(id);
  }

  async listAll(query: ListSettlementsQueryDto): Promise<SettlementStatement[]> {
    const where: FindOptionsWhere<SettlementStatement> = {};
    if (query.beneficiaryUserId) where.beneficiaryUserId = query.beneficiaryUserId;
    if (query.status) where.status = query.status;
    return this.statementsRepository.find({
      where,
      relations: { beneficiary: true },
      order: { generatedAt: 'DESC' },
    });
  }

  async listMine(beneficiaryUserId: string): Promise<SettlementStatement[]> {
    return this.statementsRepository.find({
      where: { beneficiaryUserId },
      order: { generatedAt: 'DESC' },
    });
  }

  async findOrFail(id: string): Promise<SettlementStatement> {
    const statement = await this.statementsRepository.findOne({ where: { id } });
    if (!statement) {
      throw new NotFoundException('Settlement statement not found');
    }
    return statement;
  }
}
