import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { ModerateReviewDto } from '@/modules/reviews/dto/moderate-review.dto';
import { ProductReview } from '@/modules/reviews/entities/product-review.entity';
import { ReviewsService } from '@/modules/reviews/reviews.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('pending')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List reviews awaiting moderation' })
  listPending(): Promise<ProductReview[]> {
    return this.reviewsService.listPending();
  }

  @Patch(':id/moderate')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject a pending review' })
  moderate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
  ): Promise<ProductReview> {
    return this.reviewsService.moderate(id, dto.status, user.id);
  }
}
