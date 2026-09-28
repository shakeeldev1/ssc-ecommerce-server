import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProductVariantDto {
  @ApiProperty({ example: 'TSHIRT-RED-M' })
  @IsString()
  @MinLength(2)
  sku: string;

  @ApiPropertyOptional({ example: { color: 'Red', size: 'M' } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @ApiProperty({ example: 1999.0 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ example: 2499.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  compareAtPrice?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether wholesale buyers can RFQ/bulk-order this variant',
  })
  @IsOptional()
  @IsBoolean()
  isWholesaleEligible?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum quantity for a wholesale line; omit for no minimum',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  wholesaleMoq?: number;
}
