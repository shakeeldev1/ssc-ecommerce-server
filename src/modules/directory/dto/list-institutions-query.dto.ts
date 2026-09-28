import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListInstitutionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  districtId?: string;
}
