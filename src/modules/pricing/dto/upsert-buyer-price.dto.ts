import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class UpsertBuyerPriceDto {
  @ApiProperty()
  @IsUUID()
  buyerUserId: string;

  @ApiProperty({ example: 7.75 })
  @IsNumber()
  @IsPositive()
  pricePerUnit: number;
}
