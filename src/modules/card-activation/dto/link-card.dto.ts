import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MinLength } from 'class-validator';

export class LinkCardDto {
  @ApiProperty({ example: 'CARD-1A2B3C4D' })
  @IsString()
  @MinLength(4)
  cardNumber: string;

  // The issuing system sends an 8-character alphanumeric code (e.g.
  // "A1B2C3D4"); the mock provider uses 6 digits. Accept both.
  @ApiProperty({ example: 'A1B2C3D4' })
  @IsString()
  @Length(4, 12)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'code must contain only letters and digits' })
  code: string;
}
