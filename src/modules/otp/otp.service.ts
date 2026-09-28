import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { Otp } from '@/modules/otp/entities/otp.entity';
import { OtpPurpose } from '@/modules/otp/enums/otp-purpose.enum';
import { OTP_PROVIDER, OtpProvider } from '@/modules/otp/providers/otp-provider.interface';

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    @Inject(OTP_PROVIDER)
    private readonly otpProvider: OtpProvider,
  ) {}

  async requestOtp(identifier: string, purpose: OtpPurpose): Promise<void> {
    await this.invalidatePending(identifier, purpose);

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    const otp = this.otpRepository.create({ identifier, codeHash, purpose, expiresAt });
    await this.otpRepository.save(otp);

    await this.otpProvider.send(identifier, code, purpose);
  }

  async verifyOtp(identifier: string, code: string, purpose: OtpPurpose): Promise<void> {
    const otp = await this.otpRepository.findOne({
      where: { identifier, purpose, consumedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('OTP is invalid or has expired');
    }

    if (otp.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new BadRequestException('Too many attempts, please request a new OTP');
    }

    const isMatch = await bcrypt.compare(code, otp.codeHash);
    if (!isMatch) {
      await this.otpRepository.update(otp.id, { attempts: otp.attempts + 1 });
      throw new BadRequestException('OTP is invalid or has expired');
    }

    await this.otpRepository.update(otp.id, { consumedAt: new Date() });
  }

  private async invalidatePending(identifier: string, purpose: OtpPurpose): Promise<void> {
    await this.otpRepository.update(
      { identifier, purpose, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );
  }

  private generateCode(): string {
    const max = 10 ** OTP_LENGTH;
    const code = Math.floor(Math.random() * max)
      .toString()
      .padStart(OTP_LENGTH, '0');
    return code;
  }
}
