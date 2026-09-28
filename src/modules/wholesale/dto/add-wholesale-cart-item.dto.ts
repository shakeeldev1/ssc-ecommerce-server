import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class AddWholesaleCartItemDto {
  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  quantity: number;
}
