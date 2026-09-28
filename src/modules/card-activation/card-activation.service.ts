import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { AuthService } from '@/modules/auth/auth.service';
import { AuthTokensDto } from '@/modules/auth/dto/auth-tokens.dto';
import {
  ExternalCardProfile,
  STUDENT_SYNC_PROVIDER,
  StudentSyncProvider,
} from '@/modules/card-activation/interfaces/student-sync-provider.interface';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { SmartCard } from '@/modules/smart-cards/entities/smart-card.entity';
import { SmartCardsService } from '@/modules/smart-cards/smart-cards.service';
import { StudentsService } from '@/modules/students/students.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { UsersService } from '@/modules/users/users.service';

const BCRYPT_SALT_ROUNDS = 10;

const normalizeCardNumber = (cardNumber: string): string => cardNumber.trim().toUpperCase();

@Injectable()
export class CardActivationService {
  private readonly logger = new Logger(CardActivationService.name);

  constructor(
    @Inject(STUDENT_SYNC_PROVIDER)
    private readonly studentSyncProvider: StudentSyncProvider,
    private readonly usersService: UsersService,
    private readonly studentsService: StudentsService,
    private readonly smartCardsService: SmartCardsService,
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async requestOtp(cardNumber: string): Promise<void> {
    await this.studentSyncProvider.requestOtp(normalizeCardNumber(cardNumber));
  }

  /**
   * Unauthenticated flow: verifying a card creates a brand-new SSC account
   * and logs the holder in immediately (the OTP already proved their
   * identity, and requiring a password up front would mean either a second
   * email round-trip or blocking on it). The account gets an unusable
   * random password (`isPasswordSet: false`) until they set a real one via
   * AuthService.setPassword, using the session just issued here.
   *
   * Both holder types use this flow: school-linked students and
   * individuals. The account role is STUDENT ("card holder") for both;
   * what differs is `externalHolderType` on the profile, which drives the
   * card design and which admin-set card discount applies.
   */
  async verifyAndCreateAccount(
    cardNumber: string,
    code: string,
    ipAddress?: string,
  ): Promise<AuthTokensDto> {
    const normalized = normalizeCardNumber(cardNumber);

    // Checked before the code is consumed, so the holder isn't left with a
    // used-up code and a confusing error.
    if (await this.smartCardsService.findByCardNumber(normalized)) {
      throw new ConflictException(
        'This card is already activated on SSC. Sign in to your account instead.',
      );
    }

    const externalProfile = await this.verifyAndFetchProfile(normalized, code);

    if (!externalProfile.email) {
      throw new BadRequestException(
        'This card has no email on file; ask your institution to add one before activating',
      );
    }

    if (await this.usersService.findByEmail(externalProfile.email)) {
      throw new ConflictException(
        `An SSC account with ${externalProfile.email} already exists. Sign in to it (use "Forgot password" if needed), then add your card from Account → Smart Card.`,
      );
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({
      email: externalProfile.email,
      phone: externalProfile.contactNumber ?? undefined,
      passwordHash,
      fullName: externalProfile.fullName,
      role: UserRole.STUDENT,
      isPasswordSet: false,
    });

    try {
      // Card OTP already proved the holder controls this email/identity —
      // no separate email-verification loop needed on top of it.
      await this.usersService.markEmailVerified(user.id);
      await this.attachCard(user.id, normalized, externalProfile);
    } catch (error) {
      // Roll back the half-created account so the holder can simply retry
      // (otherwise the email would be taken by an account with no card).
      this.logger.error(`card activation failed for ${normalized}; rolling back user ${user.id}`);
      await this.usersService.removeById(user.id).catch(() => undefined);
      throw error;
    }

    await this.auditLogService.record({
      actorUserId: user.id,
      action: 'card_activation.account_created',
      entityName: 'User',
      entityId: user.id,
      newValue: { cardNumber: normalized, holderType: externalProfile.holderType },
      ipAddress,
    });

    await this.notificationsService.cardActivated(
      externalProfile.contactNumber ?? externalProfile.email,
      normalized,
    );

    return this.authService.issueTokensForUser(user);
  }

  /** Authenticated flow: an existing SSC user links (or re-links) a card to their own account. */
  async linkToCurrentUser(userId: string, cardNumber: string, code: string): Promise<SmartCard> {
    const normalized = normalizeCardNumber(cardNumber);
    const externalProfile = await this.verifyAndFetchProfile(normalized, code);

    const card = await this.attachCard(userId, normalized, externalProfile);

    await this.auditLogService.record({
      actorUserId: userId,
      action: 'card_activation.linked',
      entityName: 'SmartCard',
      entityId: card.id,
      newValue: { cardNumber: normalized, holderType: externalProfile.holderType },
    });

    return card;
  }

  /**
   * Re-reads the current card from the issuer and mirrors its status,
   * validity dates and holder details (e.g. after the school updated the
   * roll number or logo, or the issuer renewed/suspended the card).
   * Exposed as "renew" — SSC can't extend a card itself.
   */
  async refreshFromIssuer(userId: string): Promise<SmartCard> {
    const card = await this.smartCardsService.getCurrentCard(userId);
    const externalProfile = await this.studentSyncProvider.fetchProfile(card.cardNumber);

    if (!externalProfile) {
      // The issuer only returns ACTIVE cards: not found = suspended/expired there.
      return this.smartCardsService.applyIssuerState(card, false);
    }

    await this.studentsService.applyExternalSync(card.studentProfileId, externalProfile);
    return this.smartCardsService.applyIssuerState(card, true, {
      issuedAt: externalProfile.issuedAt,
      expiresAt: externalProfile.expiresAt,
    });
  }

  private async attachCard(
    userId: string,
    cardNumber: string,
    externalProfile: ExternalCardProfile,
  ): Promise<SmartCard> {
    const profile = await this.studentsService.findOrCreateForUser(userId);
    const card = await this.smartCardsService.activateExternalCard(profile.id, cardNumber, {
      issuedAt: externalProfile.issuedAt,
      expiresAt: externalProfile.expiresAt,
    });
    await this.studentsService.applyExternalSync(profile.id, externalProfile);
    return card;
  }

  private async verifyAndFetchProfile(cardNumber: string, code: string) {
    const isValid = await this.studentSyncProvider.verifyOtp(cardNumber, code.trim());
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const profile = await this.studentSyncProvider.fetchProfile(cardNumber);
    if (!profile) {
      throw new NotFoundException('Card not found or not active with the issuer');
    }

    return profile;
  }
}
