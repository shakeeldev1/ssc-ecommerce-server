import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @IsPositive()
  quantity: number = 1;
}
