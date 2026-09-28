import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { InstitutionType } from '@/modules/directory/enums/institution-type.enum';

export class CreateInstitutionDto {
  @ApiProperty({ example: 'Beaconhouse School System' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: InstitutionType, example: InstitutionType.SCHOOL })
  @IsEnum(InstitutionType)
  type: InstitutionType;

  @ApiProperty()
  @IsUUID()
  districtId: string;

  @ApiPropertyOptional({ description: 'Set if this school belongs to a chain' })
  @IsOptional()
  @IsUUID()
  schoolChainId?: string;
}
