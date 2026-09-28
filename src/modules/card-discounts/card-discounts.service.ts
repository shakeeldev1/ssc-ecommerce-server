import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { UpdateCardDiscountSettingDto } from '@/modules/card-discounts/dto/update-card-discount-setting.dto';
import { CardDiscountSetting } from '@/modules/card-discounts/entities/card-discount-setting.entity';
import {
  CardDiscountComputation,
  CardDiscountLine,
  CardHolderEligibility,
} from '@/modules/card-discounts/interfaces/card-discount.interface';
import { SmartCard } from '@/modules/smart-cards/entities/smart-card.entity';
import { SmartCardStatus } from '@/modules/smart-cards/enums/smart-card-status.enum';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';
import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

@Injectable()
export class CardDiscountsService {
  constructor(
    @InjectRepository(CardDiscountSetting)
    private readonly settingsRepository: Repository<CardDiscountSetting>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepository: Repository<StudentProfile>,
    @InjectRepository(SmartCard)
    private readonly cardsRepository: Repository<SmartCard>,
    private readonly auditLogService: AuditLogService,
  ) {}

  /** Always returns one row per holder type (creating a disabled default if missing). */
  async list(): Promise<CardDiscountSetting[]> {
    const settings = await Promise.all(
      Object.values(ExternalHolderType).map((holderType) => this.getOrCreate(holderType)),
    );
    return settings;
  }

  async update(
    holderType: ExternalHolderType,
    dto: UpdateCardDiscountSettingDto,
    actorUserId: string,
  ): Promise<CardDiscountSetting> {
    const setting = await this.getOrCreate(holderType);
    const oldValue = {
      discountPercent: setting.discountPercent,
      maxDiscountPerOrder: setting.maxDiscountPerOrder,
      isActive: setting.isActive,
    };

    await this.settingsRepository.update(setting.id, {
      discountPercent: dto.discountPercent,
      maxDiscountPerOrder: dto.maxDiscountPerOrder ?? null,
      isActive: dto.isActive,
      updatedByUserId: actorUserId,
    });

    await this.auditLogService.record({
      actorUserId,
      action: 'card_discount.updated',
      entityName: 'CardDiscountSetting',
      entityId: setting.id,
      previousValue: oldValue,
      newValue: { holderType, ...dto },
    });

    return this.settingsRepository.findOneByOrFail({ id: setting.id });
  }

  /**
   * The holder type of the user's currently-usable card (active and not
   * past expiry), or null. Independent of whether a discount is configured —
   * also used to gate "student-only" coupons to real school-linked students.
   */
  async resolveActiveHolder(
    userId: string,
  ): Promise<{ holderType: ExternalHolderType; cardNumber: string } | null> {
    const profile = await this.profilesRepository.findOne({ where: { userId } });
    if (!profile?.externalHolderType) {
      return null;
    }

    const card = await this.cardsRepository.findOne({
      where: { studentProfileId: profile.id },
      order: { issuedAt: 'DESC' },
    });
    if (!card || card.status !== SmartCardStatus.ACTIVE || card.expiresAt.getTime() < Date.now()) {
      return null;
    }

    return { holderType: profile.externalHolderType, cardNumber: card.cardNumber };
  }

  async isVerifiedSchoolStudent(userId: string): Promise<boolean> {
    const holder = await this.resolveActiveHolder(userId);
    return holder?.holderType === ExternalHolderType.STUDENT;
  }

  async resolveEligibility(userId: string): Promise<CardHolderEligibility | null> {
    const holder = await this.resolveActiveHolder(userId);
    if (!holder) {
      return null;
    }

    const setting = await this.settingsRepository.findOne({
      where: { holderType: holder.holderType },
    });
    if (!setting?.isActive || setting.discountPercent <= 0) {
      return null;
    }

    return {
      holderType: holder.holderType,
      cardNumber: holder.cardNumber,
      discountPercent: setting.discountPercent,
      maxDiscountPerOrder: setting.maxDiscountPerOrder,
    };
  }

  async computeForUser(
    userId: string,
    lines: CardDiscountLine[],
  ): Promise<CardDiscountComputation> {
    const eligibility = await this.resolveEligibility(userId);
    const eligibleSubtotal = roundMoney(
      lines
        .filter((line) => line.isEligible)
        .reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    );

    if (!eligibility || eligibleSubtotal <= 0) {
      return { eligibility, eligibleSubtotal, discountAmount: 0 };
    }

    let discountAmount = roundMoney((eligibleSubtotal * eligibility.discountPercent) / 100);
    if (eligibility.maxDiscountPerOrder !== null) {
      discountAmount = Math.min(discountAmount, eligibility.maxDiscountPerOrder);
    }

    return { eligibility, eligibleSubtotal, discountAmount };
  }

  private async getOrCreate(holderType: ExternalHolderType): Promise<CardDiscountSetting> {
    const existing = await this.settingsRepository.findOne({ where: { holderType } });
    if (existing) {
      return existing;
    }
    try {
      return await this.settingsRepository.save(
        this.settingsRepository.create({ holderType, discountPercent: 0, isActive: false }),
      );
    } catch {
      // Concurrent first access created it — read it back.
      const created = await this.settingsRepository.findOne({ where: { holderType } });
      if (!created) {
        throw new NotFoundException('Card discount setting not found');
      }
      return created;
    }
  }
}
