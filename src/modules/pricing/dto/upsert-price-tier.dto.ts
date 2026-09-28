import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class UpsertPriceTierDto {
  @ApiProperty({ example: 50, description: 'Minimum quantity this price applies from' })
  @IsInt()
  @IsPositive()
  minQuantity: number;

  @ApiProperty({ example: 8.5 })
  @IsNumber()
  @IsPositive()
  pricePerUnit: number;
}
