import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RequestCardOtpDto {
  @ApiProperty({ example: 'CARD-1A2B3C4D' })
  @IsString()
  @MinLength(4)
  cardNumber: string;
}
