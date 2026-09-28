import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';
import { ReturnRequestType } from '@/modules/returns/enums/return-request-type.enum';

export class CreateReturnRequestDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: CommissionChannel })
  @IsEnum(CommissionChannel)
  orderChannel: CommissionChannel;

  @ApiProperty({ enum: ReturnRequestType })
  @IsEnum(ReturnRequestType)
  type: ReturnRequestType;

  @ApiProperty({ example: 'Wrong size delivered' })
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiPropertyOptional({
    default: true,
    description: 'RETURN only — whether the item goes back into sellable stock',
  })
  @IsOptional()
  @IsBoolean()
  restock?: boolean;

  @ApiPropertyOptional({ description: 'Required for EXCHANGE — the order line being swapped' })
  @IsOptional()
  @IsUUID()
  orderItemId?: string;

  @ApiPropertyOptional({ description: 'Required for EXCHANGE — the variant wanted instead' })
  @IsOptional()
  @IsUUID()
  replacementVariantId?: string;
}
