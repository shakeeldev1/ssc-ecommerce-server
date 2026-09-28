import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateQuoteRequestDto {
  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiProperty({ example: 500 })
  @IsInt()
  @IsPositive()
  requestedQuantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
