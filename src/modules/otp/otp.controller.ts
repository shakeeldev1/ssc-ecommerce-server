import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { RequestOtpDto } from '@/modules/otp/dto/request-otp.dto';
import { VerifyOtpDto } from '@/modules/otp/dto/verify-otp.dto';
import { OtpService } from '@/modules/otp/otp.service';

@ApiTags('otp')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Public()
  @Post('request')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request an OTP code for the given identifier and purpose' })
  async request(@Body() dto: RequestOtpDto): Promise<void> {
    await this.otpService.requestOtp(dto.identifier, dto.purpose);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify an OTP code' })
  async verify(@Body() dto: VerifyOtpDto): Promise<void> {
    await this.otpService.verifyOtp(dto.identifier, dto.code, dto.purpose);
  }
}
