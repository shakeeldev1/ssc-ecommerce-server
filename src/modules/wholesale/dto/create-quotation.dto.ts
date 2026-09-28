import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateQuotationDto {
  @ApiProperty({ example: 7.5 })
  @IsNumber()
  @IsPositive()
  pricePerUnit: number;

  @ApiPropertyOptional({ description: 'Defaults to the requested quantity if omitted' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
