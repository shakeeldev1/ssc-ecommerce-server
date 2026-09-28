import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as QRCode from 'qrcode';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { CardVerificationResultDto } from '@/modules/smart-cards/dto/card-verification-result.dto';
import { QrCodeResponseDto } from '@/modules/smart-cards/dto/qr-code-response.dto';
import { SmartCard } from '@/modules/smart-cards/entities/smart-card.entity';
import { SmartCardsService } from '@/modules/smart-cards/smart-cards.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';

@ApiTags('smart-cards')
@Controller()
export class SmartCardsController {
  constructor(private readonly smartCardsService: SmartCardsService) {}

  @ApiBearerAuth()
  @Roles(UserRole.STUDENT)
  @Get('students/me/card')
  @ApiOperation({ summary: "Get the current student's smart card" })
  getCurrentCard(@CurrentUser() user: AuthenticatedUser): Promise<SmartCard> {
    return this.smartCardsService.getCurrentCard(user.id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.STUDENT)
  @Post('students/me/card/report-lost')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report the current smart card as lost (blocks it)' })
  reportLost(@CurrentUser() user: AuthenticatedUser): Promise<SmartCard> {
    return this.smartCardsService.reportLost(user.id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.STUDENT)
  @Post('students/me/card/rotate-qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the QR token for the current active card' })
  rotateQrCode(@CurrentUser() user: AuthenticatedUser): Promise<SmartCard> {
    return this.smartCardsService.rotateQrCode(user.id);
  }

  @ApiBearerAuth()
  @Roles(UserRole.STUDENT)
  @Get('students/me/card/qrcode')
  @ApiOperation({ summary: 'Get the current card QR code as a PNG data URL' })
  async getQrCode(@CurrentUser() user: AuthenticatedUser): Promise<QrCodeResponseDto> {
    const card = await this.smartCardsService.getCurrentCard(user.id);
    const qrCodeDataUrl = await QRCode.toDataURL(card.qrToken);
    return { qrCodeDataUrl };
  }

  @Public()
  @Get('cards/verify/:qrToken')
  @ApiOperation({ summary: 'Verify a smart card by its QR token (used by scanners/POS)' })
  verify(@Param('qrToken') qrToken: string): Promise<CardVerificationResultDto> {
    return this.smartCardsService.verifyByQrToken(qrToken);
  }
}
