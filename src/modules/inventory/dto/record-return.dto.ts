import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RecordReturnDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: true,
    description: 'Whether the returned item goes back into available stock',
  })
  @IsBoolean()
  restock: boolean;

  @ApiPropertyOptional({ example: 'Customer changed their mind, item unopened' })
  @IsOptional()
  @IsString()
  reason?: string;
}
