import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReviewStatus } from '@/modules/reviews/enums/review-status.enum';

export class ModerateReviewDto {
  @ApiProperty({ enum: ReviewStatus, enumName: 'ModerationDecision' })
  @IsEnum(ReviewStatus)
  status: ReviewStatus.APPROVED | ReviewStatus.REJECTED;
}
