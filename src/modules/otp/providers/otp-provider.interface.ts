import { OtpPurpose } from '@/modules/otp/enums/otp-purpose.enum';

export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

/**
 * Delivery channel for OTP codes (SMS/WhatsApp/email). Real gateways
 * (see PROJECT_PLAN.md Phase 8) are supplied by the client later; until
 * then requests are served by ConsoleOtpProvider.
 */
export interface OtpProvider {
  send(identifier: string, code: string, purpose: OtpPurpose): Promise<void>;
}
