import { Injectable, Logger } from '@nestjs/common';
import { OtpPurpose } from '@/modules/otp/enums/otp-purpose.enum';
import { OtpProvider } from '@/modules/otp/providers/otp-provider.interface';

@Injectable()
export class ConsoleOtpProvider implements OtpProvider {
  private readonly logger = new Logger(ConsoleOtpProvider.name);

  send(identifier: string, code: string, purpose: OtpPurpose): Promise<void> {
    this.logger.log(`OTP for ${identifier} (${purpose}): ${code}`);
    return Promise.resolve();
  }
}
