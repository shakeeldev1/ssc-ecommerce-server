import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateSchoolChainDto {
  @ApiProperty({ example: 'Beaconhouse School System' })
  @IsString()
  @MinLength(2)
  name: string;
}
