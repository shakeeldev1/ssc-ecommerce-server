import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MinLength, NotEquals } from 'class-validator';

export class ManualAdjustmentDto {
  @ApiProperty({ example: -2, description: 'Positive to add stock, negative to remove it' })
  @IsInt()
  @NotEquals(0)
  quantityChange: number;

  @ApiProperty({ example: 'Physical stock-take correction' })
  @IsString()
  @MinLength(3)
  reason: string;
}
