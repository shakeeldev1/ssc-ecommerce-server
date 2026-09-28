import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDistrictDto {
  @ApiProperty({ example: 'Lahore' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty()
  @IsUUID()
  regionId: string;
}
