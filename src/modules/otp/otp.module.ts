import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Otp } from '@/modules/otp/entities/otp.entity';
import { OtpController } from '@/modules/otp/otp.controller';
import { OtpService } from '@/modules/otp/otp.service';
import { ConsoleOtpProvider } from '@/modules/otp/providers/console-otp.provider';
import { OTP_PROVIDER } from '@/modules/otp/providers/otp-provider.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Otp])],
  controllers: [OtpController],
  providers: [OtpService, { provide: OTP_PROVIDER, useClass: ConsoleOtpProvider }],
  exports: [OtpService],
})
export class OtpModule {}
