import { ApiProperty } from '@nestjs/swagger';

export class VendorApplicationResponseDto {
  @ApiProperty({ example: 'vendor@example.com' })
  email: string;

  @ApiProperty({
    example: 'Application submitted. An OTP has been sent to your email to verify it.',
  })
  message: string;
}
