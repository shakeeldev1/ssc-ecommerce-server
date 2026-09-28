import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { CheckoutWholesaleDto } from '@/modules/wholesale/dto/checkout-wholesale.dto';
import { CreateQuotationDto } from '@/modules/wholesale/dto/create-quotation.dto';
import { CreateQuoteRequestDto } from '@/modules/wholesale/dto/create-quote-request.dto';
import { QuoteRequest } from '@/modules/wholesale/entities/quote-request.entity';
import { Quotation } from '@/modules/wholesale/entities/quotation.entity';
import { WholesaleOrder } from '@/modules/wholesale/entities/wholesale-order.entity';
import { WholesaleQuotesService } from '@/modules/wholesale/wholesale-quotes.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';

const QUOTATION_ISSUERS = [UserRole.SUPER_ADMIN, UserRole.VENDOR, UserRole.WHOLESALE_VENDOR];

@ApiTags('wholesale')
@ApiBearerAuth()
@Controller('wholesale')
export class WholesaleQuotesController {
  constructor(private readonly quotesService: WholesaleQuotesService) {}

  @Post('quote-requests')
  @Roles(UserRole.WHOLESALE_BUYER)
  @ApiOperation({ summary: 'Request a quote (RFQ) for a wholesale-eligible variant' })
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuoteRequestDto,
  ): Promise<QuoteRequest> {
    return this.quotesService.createRequest(user.id, dto);
  }

  @Get('quote-requests/mine')
  @Roles(UserRole.WHOLESALE_BUYER)
  @ApiOperation({ summary: "List the current buyer's own quote requests" })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<QuoteRequest[]> {
    return this.quotesService.listMine(user.id);
  }

  @Get('quote-requests/incoming')
  @Roles(...QUOTATION_ISSUERS)
  @ApiOperation({ summary: "List RFQs against the caller's own wholesale-eligible variants" })
  listIncoming(@CurrentUser() user: AuthenticatedUser): Promise<QuoteRequest[]> {
    return this.quotesService.listIncoming(user);
  }

  @Get('quote-requests/:id')
  @ApiOperation({ summary: 'Get one quote request' })
  getRequest(@Param('id') id: string): Promise<QuoteRequest> {
    return this.quotesService.findRequestOrFail(id);
  }

  @Post('quote-requests/:id/quotations')
  @Roles(...QUOTATION_ISSUERS)
  @ApiOperation({ summary: 'Respond to an open RFQ with a price/quantity/validity quotation' })
  createQuotation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
    @Body() dto: CreateQuotationDto,
  ): Promise<Quotation> {
    return this.quotesService.createQuotation(requestId, dto, user);
  }

  @Get('quotations/:id')
  @ApiOperation({ summary: 'Get one quotation' })
  getQuotation(@Param('id') id: string): Promise<Quotation> {
    return this.quotesService.findQuotationOrFail(id);
  }

  @Post('quotations/:id/accept')
  @Roles(UserRole.WHOLESALE_BUYER)
  @ApiOperation({ summary: 'Accept a quotation, converting it into a wholesale order' })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CheckoutWholesaleDto,
  ): Promise<WholesaleOrder> {
    return this.quotesService.accept(id, user.id, dto.shippingAddress, dto.paymentMethod);
  }

  @Post('quotations/:id/reject')
  @Roles(UserRole.WHOLESALE_BUYER)
  @ApiOperation({ summary: 'Reject a quotation' })
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Quotation> {
    return this.quotesService.reject(id, user.id);
  }
}
