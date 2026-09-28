import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class UpdateCardDiscountSettingDto {
  @ApiProperty({ example: 10, description: 'Percent off eligible products (0–100)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent: number;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 1500,
    description: 'PKR cap per order; null = no cap',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDiscountPerOrder?: number | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
