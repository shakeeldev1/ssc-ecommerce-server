import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';

export const STUDENT_SYNC_PROVIDER = Symbol('STUDENT_SYNC_PROVIDER');

export interface ExternalCardProfile {
  cardNumber: string;
  holderType: ExternalHolderType;
  fullName: string;
  email: string | null;
  contactNumber: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  photoUrl: string | null;
  institutionName: string | null;
  className: string | null;
  // Fields below were added to the external contract later; an older
  // deployment of that system omits them, so they are always nullable.
  /** Issued/expiry dates as recorded by the card issuer. */
  issuedAt: string | null;
  expiresAt: string | null;
  /** School-linked students only (always null for individuals). */
  institutionLogoUrl: string | null;
  sectionName: string | null;
  rollNumber: string | null;
}

/**
 * Talks to the external Student Smart Card system
 * (see EXTERNAL_INTEGRATION_SPEC.md) to verify a physical card and pull the
 * holder's profile. Cards are issued and owned by that system — SSC never
 * generates its own card numbers.
 */
export interface StudentSyncProvider {
  requestOtp(cardNumber: string): Promise<void>;
  /**
   * Resolves false only for a wrong/expired code; throws
   * ServiceUnavailableException when the external system can't be reached,
   * so an outage is never reported to the holder as "invalid code".
   */
  verifyOtp(cardNumber: string, code: string): Promise<boolean>;
  fetchProfile(cardNumber: string): Promise<ExternalCardProfile | null>;
}
