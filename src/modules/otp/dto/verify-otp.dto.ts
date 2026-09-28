import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { OtpPurpose } from '@/modules/otp/enums/otp-purpose.enum';

export class VerifyOtpDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.EMAIL_VERIFICATION })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
