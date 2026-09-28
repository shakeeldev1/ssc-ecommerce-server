import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { ListWholesaleVariantsQueryDto } from '@/modules/wholesale/dto/list-wholesale-variants-query.dto';
import { WholesaleCatalogueService } from '@/modules/wholesale/wholesale-catalogue.service';

@ApiTags('wholesale')
@Controller('wholesale/variants')
export class WholesaleCatalogueController {
  constructor(private readonly catalogueService: WholesaleCatalogueService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Browse the wholesale catalogue (variants opened up for bulk/RFQ purchase)',
  })
  browse(@Query() query: ListWholesaleVariantsQueryDto): Promise<PaginatedResult<ProductVariant>> {
    return this.catalogueService.browse(query);
  }
}
