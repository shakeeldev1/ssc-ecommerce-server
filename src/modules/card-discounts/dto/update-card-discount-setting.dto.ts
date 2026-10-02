import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CardDiscountType } from '@/modules/card-discounts/enums/card-discount-type.enum';

export class UpdateCardDiscountSettingDto {
  @ApiProperty({
    enum: CardDiscountType,
    example: CardDiscountType.PERCENT,
    description: 'percent = % off eligible products; fixed = flat PKR amount off',
  })
  @IsEnum(CardDiscountType)
  discountType: CardDiscountType;

  @ApiProperty({
    example: 10,
    description: 'Percent off eligible products (0–100). Required when discountType = percent.',
  })
  @ValidateIf((o: UpdateCardDiscountSettingDto) => o.discountType === CardDiscountType.PERCENT)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent = 0;

  @ApiProperty({
    example: 200,
    description: 'Flat PKR amount off the order. Required when discountType = fixed.',
  })
  @ValidateIf((o: UpdateCardDiscountSettingDto) => o.discountType === CardDiscountType.FIXED)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount = 0;

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
