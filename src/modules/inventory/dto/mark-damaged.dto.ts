import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MarkDamagedDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Damaged in warehouse handling' })
  @IsOptional()
  @IsString()
  reason?: string;
}
