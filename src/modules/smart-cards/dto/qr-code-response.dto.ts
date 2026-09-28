import { ApiProperty } from '@nestjs/swagger';

export class QrCodeResponseDto {
  @ApiProperty({ description: 'Base64 data URL (PNG) of the QR code' })
  qrCodeDataUrl: string;
}
