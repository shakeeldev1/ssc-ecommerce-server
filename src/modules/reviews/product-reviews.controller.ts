import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { CreateReviewDto } from '@/modules/reviews/dto/create-review.dto';
import { ProductReview } from '@/modules/reviews/entities/product-review.entity';
import { ReviewsService } from '@/modules/reviews/reviews.service';

@ApiTags('reviews')
@Controller('catalog/products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List approved reviews for a product' })
  list(@Param('productId') productId: string): Promise<ProductReview[]> {
    return this.reviewsService.listApprovedForProduct(productId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review a product from a delivered order (goes to moderation)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ProductReview> {
    return this.reviewsService.create(user.id, productId, dto);
  }
}
