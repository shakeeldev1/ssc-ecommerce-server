import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  quantity: number;
}
