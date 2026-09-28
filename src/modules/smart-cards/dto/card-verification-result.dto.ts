import { ApiProperty } from '@nestjs/swagger';

export class CardVerificationResultDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  studentName?: string;

  @ApiProperty({ required: false })
  studentIdNumber?: string;

  @ApiProperty({ required: false, enum: ['student', 'individual'] })
  holderType?: string;

  @ApiProperty({ required: false, nullable: true })
  rollNumber?: string | null;

  @ApiProperty({ required: false })
  expiresAt?: string;

  @ApiProperty({ required: false })
  photoUrl?: string | null;

  @ApiProperty({ required: false })
  institutionName?: string | null;

  @ApiProperty({ required: false })
  cardStatus?: string;

  @ApiProperty({ required: false })
  discountEligible?: boolean;
}
