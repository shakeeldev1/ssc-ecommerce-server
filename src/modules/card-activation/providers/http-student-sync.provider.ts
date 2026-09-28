import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '@/config/configuration';
import {
  ExternalCardProfile,
  StudentSyncProvider,
} from '@/modules/card-activation/interfaces/student-sync-provider.interface';
import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';

interface ExternalVerifyResponse {
  valid: boolean;
}

interface ExternalProfileResponse {
  cardNumber: string;
  holderType: 'student' | 'individual';
  fullName: string;
  email: string | null;
  contactNumber: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  photoUrl: string | null;
  institutionName: string | null;
  className: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  institutionLogoUrl?: string | null;
  sectionName?: string | null;
  rollNumber?: string | null;
}

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Real integration with the external Student Smart Card system — see
 * EXTERNAL_INTEGRATION_SPEC.md. `baseUrl` must already include that
 * system's own "/api/v1" prefix (e.g. https://api.studentsmartcardpk.com/api/v1).
 *
 * OTP calls go to the API-key-protected `/integrations/ecommerce/...`
 * endpoints (not per-IP throttled, since every SSC user shares SSC's server
 * IP). If the external system hasn't been upgraded yet (404 on those
 * routes), it falls back to the older public `/cards/...` endpoints.
 */
@Injectable()
export class HttpStudentSyncProvider implements StudentSyncProvider {
  private readonly logger = new Logger(HttpStudentSyncProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(configService: ConfigService<Configuration, true>) {
    const config = configService.get('externalStudentSystem', { infer: true });
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async requestOtp(cardNumber: string): Promise<void> {
    let response = await this.send(this.integrationUrl(cardNumber, 'request-verification-code'), {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey },
    });
    if (await this.isMissingRoute(response)) {
      response = await this.send(`${this.baseUrl}/cards/request-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber }),
      });
    }

    if (response.ok) {
      return;
    }

    const message = await this.extractErrorMessage(response);
    this.logger.warn(
      `request-verification-code failed for card ${cardNumber}: HTTP ${response.status} ${message ?? ''}`,
    );

    if (response.status === 404) {
      throw new NotFoundException(message ?? 'Card not found');
    }
    if (response.status === 400) {
      throw new BadRequestException(
        message ?? 'Unable to send a verification code for this card number',
      );
    }
    if (response.status === 429) {
      throw new HttpException(
        message ?? 'Please wait a minute before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw new ServiceUnavailableException(
      'The card verification service is temporarily unavailable',
    );
  }

  async verifyOtp(cardNumber: string, code: string): Promise<boolean> {
    let response = await this.send(this.integrationUrl(cardNumber, 'verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
      body: JSON.stringify({ code }),
    });
    if (await this.isMissingRoute(response)) {
      response = await this.send(`${this.baseUrl}/cards/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber, code }),
      });
    }

    if (response.ok) {
      const body = (await response.json()) as ExternalVerifyResponse;
      return body.valid === true;
    }

    // 4xx = the external system rejected the input (malformed code, etc.):
    // treat as an invalid code. Anything else is an outage.
    if (response.status >= 400 && response.status < 500 && response.status !== 401) {
      return false;
    }
    this.logger.warn(`verify failed for card ${cardNumber}: HTTP ${response.status}`);
    throw new ServiceUnavailableException(
      'The card verification service is temporarily unavailable. Please try again shortly.',
    );
  }

  async fetchProfile(cardNumber: string): Promise<ExternalCardProfile | null> {
    const response = await this.send(this.integrationUrl(cardNumber, 'profile'), {
      headers: { 'x-api-key': this.apiKey },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      this.logger.warn(`profile fetch failed for card ${cardNumber}: HTTP ${response.status}`);
      throw new ServiceUnavailableException(
        'Your card was verified, but we could not load its details right now. Please try again shortly.',
      );
    }

    const body = (await response.json()) as ExternalProfileResponse;
    const isIndividual = body.holderType === 'individual';

    return {
      cardNumber: body.cardNumber,
      holderType: isIndividual ? ExternalHolderType.INDIVIDUAL : ExternalHolderType.STUDENT,
      fullName: body.fullName,
      email: body.email,
      contactNumber: body.contactNumber,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      photoUrl: body.photoUrl,
      institutionName: isIndividual ? null : body.institutionName,
      className: isIndividual ? null : body.className,
      issuedAt: body.issuedAt ?? null,
      expiresAt: body.expiresAt ?? null,
      institutionLogoUrl: isIndividual ? null : (body.institutionLogoUrl ?? null),
      sectionName: isIndividual ? null : (body.sectionName ?? null),
      rollNumber: isIndividual ? null : (body.rollNumber ?? null),
    };
  }

  private integrationUrl(cardNumber: string, action: string): string {
    return `${this.baseUrl}/integrations/ecommerce/cards/${encodeURIComponent(cardNumber)}/${action}`;
  }

  /** Network failures/timeouts become a 503 rather than a raw fetch error. */
  private async send(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      this.logger.error(`external card system unreachable (${url}): ${String(error)}`);
      throw new ServiceUnavailableException(
        'The card verification service is temporarily unavailable. Please try again shortly.',
      );
    }
  }

  /**
   * A 404 from Nest's router ("Cannot POST ...") means the integration
   * route doesn't exist on that deployment yet — distinct from a 404
   * "Card not found" returned by the route itself.
   */
  private async isMissingRoute(response: Response): Promise<boolean> {
    if (response.status !== 404) {
      return false;
    }
    const message = await this.extractErrorMessage(response.clone());
    return message === null || /^Cannot (GET|POST)/i.test(message);
  }

  private async extractErrorMessage(response: Response): Promise<string | null> {
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        return body.message.join(', ');
      }
      return body.message ?? null;
    } catch {
      return null;
    }
  }
}
