import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { StorefrontStats } from '@/modules/stats/interfaces/storefront-stats.interface';
import { StatsService } from '@/modules/stats/stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Public()
  @Get('storefront')
  @ApiOperation({ summary: 'Aggregate counts for the public storefront (About page, etc.)' })
  getStorefrontStats(): Promise<StorefrontStats> {
    return this.statsService.getStorefrontStats();
  }
}
