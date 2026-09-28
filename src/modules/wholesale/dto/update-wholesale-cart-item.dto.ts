import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class UpdateWholesaleCartItemDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  quantity: number;
}
