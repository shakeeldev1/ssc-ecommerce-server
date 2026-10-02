import { Injectable, Logger } from '@nestjs/common';
import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';
import {
  ExternalCardProfile,
  StudentSyncProvider,
} from '@/modules/card-activation/interfaces/student-sync-provider.interface';

const OTP_TTL_MS = 5 * 60 * 1000;

interface PendingOtp {
  code: string;
  expiresAt: number;
}

/**
 * Stand-in for the real studentsmartcardpk.com integration (not built yet —
 * see EXTERNAL_INTEGRATION_SPEC.md). Accepts ANY card number and returns a
 * deterministic fake profile, so the activation flow can be built and
 * tested end-to-end now. Swap for an HTTP-backed implementation, in
 * card-activation.module.ts, once the real endpoint exists.
 */
@Injectable()
export class MockStudentSyncProvider implements StudentSyncProvider {
  private readonly logger = new Logger(MockStudentSyncProvider.name);
  private readonly pendingOtps = new Map<string, PendingOtp>();

  requestOtp(cardNumber: string): Promise<void> {
    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    this.pendingOtps.set(cardNumber, { code, expiresAt: Date.now() + OTP_TTL_MS });
    this.logger.log(`OTP for ${cardNumber} (card_verification): ${code}`);
    return Promise.resolve();
  }

  verifyOtp(cardNumber: string, code: string): Promise<boolean> {
    const pending = this.pendingOtps.get(cardNumber);
    if (!pending || pending.expiresAt < Date.now() || pending.code !== code) {
      return Promise.resolve(false);
    }
    this.pendingOtps.delete(cardNumber);
    return Promise.resolve(true);
  }

  /**
   * Card numbers starting with "IND-" (the external system issues individual
   * cards as IND-CARD-XXXXXXXX) mock an individual holder; anything else
   * mocks a school-linked student.
   */
  fetchProfile(cardNumber: string): Promise<ExternalCardProfile | null> {
    const email = `${cardNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    if (cardNumber.toUpperCase().startsWith('IND-')) {
      return Promise.resolve({
        cardNumber,
        holderType: ExternalHolderType.INDIVIDUAL,
        fullName: `Test Individual ${cardNumber}`,
        email,
        contactNumber: '+923000000001',
        dateOfBirth: '1995-01-01',
        gender: 'female',
        photoUrl: null,
        institutionName: null,
        className: null,
        issuedAt,
        expiresAt,
        institutionLogoUrl: null,
        sectionName: null,
        rollNumber: null,
        productVariant: 3,
        coverageAmount: 300_000,
      });
    }

    return Promise.resolve({
      cardNumber,
      holderType: ExternalHolderType.STUDENT,
      fullName: `Test Student ${cardNumber}`,
      email,
      contactNumber: '+923000000000',
      dateOfBirth: '2007-01-01',
      gender: 'male',
      photoUrl: null,
      institutionName: 'Demo High School',
      className: '10th Grade',
      issuedAt,
      expiresAt,
      institutionLogoUrl: null,
      sectionName: 'A',
      rollNumber: '1042',
      productVariant: 5,
      coverageAmount: 500_000,
    });
  }
}
