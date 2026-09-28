import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CardActivationService } from '@/modules/card-activation/card-activation.service';
import { LinkCardDto } from '@/modules/card-activation/dto/link-card.dto';
import { RequestCardOtpDto } from '@/modules/card-activation/dto/request-card-otp.dto';
import { VerifyCardActivationDto } from '@/modules/card-activation/dto/verify-card-activation.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthTokensDto } from '@/modules/auth/dto/auth-tokens.dto';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { SmartCard } from '@/modules/smart-cards/entities/smart-card.entity';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('card-activation')
@Controller()
export class CardActivationController {
  constructor(private readonly cardActivationService: CardActivationService) {}

  @Public()
  @Post('card-activation/request-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send an OTP for the given (externally-issued) card number' })
  async requestOtp(@Body() dto: RequestCardOtpDto): Promise<void> {
    await this.cardActivationService.requestOtp(dto.cardNumber);
  }

  @Public()
  @Post('card-activation/verify')
  @ApiOperation({
    summary:
      'Verify a card OTP, create a new SSC account for the holder, and log them in. ' +
      'Call POST /auth/set-password next with the returned access token.',
  })
  verify(@Body() dto: VerifyCardActivationDto, @Req() request: Request): Promise<AuthTokensDto> {
    return this.cardActivationService.verifyAndCreateAccount(dto.cardNumber, dto.code, request.ip);
  }

  @ApiBearerAuth()
  @Roles(UserRole.STUDENT)
  @Post('students/me/card/link')
  @ApiOperation({ summary: 'Link (or re-link) a verified card to the current account' })
  link(@CurrentUser() user: AuthenticatedUser, @Body() dto: LinkCardDto): Promise<SmartCard> {
    return this.cardActivationService.linkToCurrentUser(user.id, dto.cardNumber, dto.code);
  }

  @ApiBearerAuth()
  @Roles(UserRole.STUDENT)
  @Post('students/me/card/renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Refresh the current card from the issuer (status, validity dates, school, class, roll number, logo). ' +
      'Card validity is set by the issuing system; SSC cannot extend it on its own.',
  })
  renew(@CurrentUser() user: AuthenticatedUser): Promise<SmartCard> {
    return this.cardActivationService.refreshFromIssuer(user.id);
  }
}
