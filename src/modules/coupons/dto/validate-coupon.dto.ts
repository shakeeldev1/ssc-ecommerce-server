import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  code: string;
}
