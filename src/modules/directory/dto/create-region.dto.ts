import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({ example: 'Punjab' })
  @IsString()
  @MinLength(2)
  name: string;
}
