import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardVerificationResultDto } from '@/modules/smart-cards/dto/card-verification-result.dto';
import { SmartCard } from '@/modules/smart-cards/entities/smart-card.entity';
import { SmartCardStatus } from '@/modules/smart-cards/enums/smart-card-status.enum';
import { generateQrToken } from '@/modules/smart-cards/utils/generate-card-identifiers.util';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';
import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';
import { StudentsService } from '@/modules/students/students.service';

// Fallback only, for an issuer that doesn't report card expiry yet.
const CARD_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;

export interface IssuerCardDates {
  issuedAt: string | null;
  expiresAt: string | null;
}

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

@Injectable()
export class SmartCardsService {
  constructor(
    @InjectRepository(SmartCard)
    private readonly cardsRepository: Repository<SmartCard>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepository: Repository<StudentProfile>,
    private readonly studentsService: StudentsService,
  ) {}

  findByCardNumber(cardNumber: string): Promise<SmartCard | null> {
    return this.cardsRepository.findOne({ where: { cardNumber } });
  }

  async getCurrentCard(userId: string): Promise<SmartCard> {
    const profile = await this.studentsService.findOrCreateForUser(userId);
    return this.getLatestCardOrFail(profile.id);
  }

  /**
   * Activates (or, if one already exists, re-issues) a smart card using a
   * card number issued by the external Student Smart Card system — see
   * EXTERNAL_INTEGRATION_SPEC.md. Called only after that system has already
   * confirmed OTP verification for this card number; SSC never generates
   * its own card numbers.
   */
  async activateExternalCard(
    studentProfileId: string,
    cardNumber: string,
    dates: IssuerCardDates = { issuedAt: null, expiresAt: null },
  ): Promise<SmartCard> {
    const existingByNumber = await this.cardsRepository.findOne({ where: { cardNumber } });
    if (existingByNumber) {
      if (existingByNumber.studentProfileId === studentProfileId) {
        // Re-verifying the card already on this account: just re-sync it.
        return this.applyIssuerState(existingByNumber, true, dates);
      }
      throw new ConflictException(
        'This card is already activated on another SSC account. Sign in to that account, or contact support.',
      );
    }

    const currentCard = await this.getLatestCard(studentProfileId);
    const activeOrSuspended =
      currentCard?.status === SmartCardStatus.ACTIVE ||
      currentCard?.status === SmartCardStatus.SUSPENDED;

    if (activeOrSuspended) {
      throw new ConflictException(
        'You already have an active smart card; report it lost before linking a new one',
      );
    }

    if (currentCard) {
      await this.cardsRepository.update(currentCard.id, { status: SmartCardStatus.RE_ISSUED });
    }

    return this.issueNewCard(studentProfileId, cardNumber, currentCard?.id ?? null, dates);
  }

  /**
   * Mirrors the issuer's view of a card onto SSC's copy. Validity is owned
   * by the external Student Smart Card system - SSC never extends a card on
   * its own (previously "renew" added a year locally, letting a holder keep
   * a card discount after the issuer had expired or suspended the card).
   * A card the user reported lost here (BLOCKED) or that was superseded
   * (RE_ISSUED) is never revived.
   */
  async applyIssuerState(
    card: SmartCard,
    issuerActive: boolean,
    dates: IssuerCardDates = { issuedAt: null, expiresAt: null },
  ): Promise<SmartCard> {
    if (card.status === SmartCardStatus.BLOCKED || card.status === SmartCardStatus.RE_ISSUED) {
      return card;
    }

    const expiresAt = parseDate(dates.expiresAt) ?? card.expiresAt;
    const issuedAt = parseDate(dates.issuedAt) ?? card.issuedAt;
    let status: SmartCardStatus;
    if (!issuerActive) {
      status = SmartCardStatus.SUSPENDED;
    } else if (expiresAt.getTime() < Date.now()) {
      status = SmartCardStatus.EXPIRED;
    } else {
      status = SmartCardStatus.ACTIVE;
    }

    await this.cardsRepository.update(card.id, { status, expiresAt, issuedAt });
    return this.cardsRepository.findOneByOrFail({ id: card.id });
  }

  async reportLost(userId: string): Promise<SmartCard> {
    const profile = await this.studentsService.findOrCreateForUser(userId);
    const card = await this.getLatestCardOrFail(profile.id);

    if (card.status !== SmartCardStatus.ACTIVE && card.status !== SmartCardStatus.SUSPENDED) {
      throw new BadRequestException('Only an active or suspended card can be reported lost');
    }

    await this.cardsRepository.update(card.id, { status: SmartCardStatus.BLOCKED });
    return this.getLatestCardOrFail(profile.id);
  }

  async rotateQrCode(userId: string): Promise<SmartCard> {
    const profile = await this.studentsService.findOrCreateForUser(userId);
    const card = await this.getLatestCardOrFail(profile.id);

    if (card.status !== SmartCardStatus.ACTIVE) {
      throw new BadRequestException('Only an active card can have its QR code rotated');
    }

    await this.cardsRepository.update(card.id, { qrToken: generateQrToken() });
    return this.getLatestCardOrFail(profile.id);
  }

  async verifyByQrToken(qrToken: string): Promise<CardVerificationResultDto> {
    const card = await this.cardsRepository.findOne({ where: { qrToken } });
    if (!card) {
      return { valid: false, reason: 'Card not found' };
    }

    if (this.isExpiredButNotMarked(card)) {
      await this.cardsRepository.update(card.id, { status: SmartCardStatus.EXPIRED });
      card.status = SmartCardStatus.EXPIRED;
    }

    if (card.status !== SmartCardStatus.ACTIVE) {
      return { valid: false, reason: `Card is ${card.status}`, cardStatus: card.status };
    }

    const profile = await this.profilesRepository.findOne({
      where: { id: card.studentProfileId },
      relations: { user: true, institution: true },
    });
    if (!profile) {
      return { valid: false, reason: 'Student profile not found' };
    }

    const isIndividual = profile.externalHolderType === ExternalHolderType.INDIVIDUAL;
    return {
      valid: true,
      studentName: profile.user.fullName,
      studentIdNumber: profile.studentIdNumber,
      holderType: profile.externalHolderType ?? ExternalHolderType.STUDENT,
      rollNumber: isIndividual ? null : profile.externalRollNumber,
      photoUrl: profile.photoUrl,
      institutionName: isIndividual
        ? null
        : (profile.externalInstitutionName ?? profile.institution?.name ?? null),
      cardStatus: card.status,
      expiresAt: card.expiresAt.toISOString(),
      // Eligible for this holder type's card discount (the rate itself is
      // set by admins per holder type - see /card-discounts).
      discountEligible: true,
    };
  }

  private async issueNewCard(
    studentProfileId: string,
    cardNumber: string,
    replacesCardId: string | null,
    dates: IssuerCardDates,
  ): Promise<SmartCard> {
    const now = new Date();
    const issuedAt = parseDate(dates.issuedAt) ?? now;
    const expiresAt = parseDate(dates.expiresAt) ?? new Date(now.getTime() + CARD_VALIDITY_MS);
    const card = this.cardsRepository.create({
      studentProfileId,
      cardNumber,
      qrToken: generateQrToken(),
      status:
        expiresAt.getTime() < now.getTime() ? SmartCardStatus.EXPIRED : SmartCardStatus.ACTIVE,
      replacesCardId,
      issuedAt,
      expiresAt,
    });
    return this.cardsRepository.save(card);
  }

  private async getLatestCard(studentProfileId: string): Promise<SmartCard | null> {
    return this.cardsRepository.findOne({
      where: { studentProfileId },
      order: { issuedAt: 'DESC' },
    });
  }

  private async getLatestCardOrFail(studentProfileId: string): Promise<SmartCard> {
    const card = await this.getLatestCard(studentProfileId);
    if (!card) {
      throw new NotFoundException('No smart card has been activated for this student yet');
    }
    return card;
  }

  private isExpiredButNotMarked(card: SmartCard): boolean {
    return card.status === SmartCardStatus.ACTIVE && card.expiresAt.getTime() < Date.now();
  }
}
