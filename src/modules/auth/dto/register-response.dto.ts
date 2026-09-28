import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ example: 'student@example.com' })
  email: string;

  @ApiProperty({ example: 'Registration successful. An OTP has been sent to your email.' })
  message: string;
}
