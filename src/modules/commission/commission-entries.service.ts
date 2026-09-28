import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { CommissionService } from '@/modules/commission/commission.service';
import { ListCommissionEntriesQueryDto } from '@/modules/commission/dto/list-commission-entries-query.dto';
import { CommissionEntry } from '@/modules/commission/entities/commission-entry.entity';

@Injectable()
export class CommissionEntriesService {
  constructor(
    @InjectRepository(CommissionEntry)
    private readonly entriesRepository: Repository<CommissionEntry>,
    private readonly commissionService: CommissionService,
  ) {}

  async listAll(query: ListCommissionEntriesQueryDto): Promise<PaginatedResult<CommissionEntry>> {
    await this.commissionService.releaseElapsedHolds();
    return this.paginate(this.buildWhere(query), query);
  }

  async listMine(
    beneficiaryUserId: string,
    query: ListCommissionEntriesQueryDto,
  ): Promise<PaginatedResult<CommissionEntry>> {
    await this.commissionService.releaseElapsedHolds();
    return this.paginate({ ...this.buildWhere(query), beneficiaryUserId }, query);
  }

  private buildWhere(query: ListCommissionEntriesQueryDto): FindOptionsWhere<CommissionEntry> {
    const where: FindOptionsWhere<CommissionEntry> = {};
    if (query.status) where.status = query.status;
    if (query.orderChannel) where.orderChannel = query.orderChannel;
    if (query.beneficiaryUserId) where.beneficiaryUserId = query.beneficiaryUserId;
    return where;
  }

  private async paginate(
    where: FindOptionsWhere<CommissionEntry>,
    query: ListCommissionEntriesQueryDto,
  ): Promise<PaginatedResult<CommissionEntry>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.entriesRepository.findAndCount({
      where,
      // Load the beneficiary so the ledger can show a name (passwordHash is @Exclude'd).
      relations: { beneficiary: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
