import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '@/modules/users/enums/user-role.enum';

export const VENDOR_APPLICATION_ROLES = [UserRole.VENDOR, UserRole.WHOLESALE_VENDOR] as const;

export class ApplyVendorDto {
  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'P@ssw0rd123' })
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one number',
  })
  password: string;

  @ApiProperty({ example: 'Ali Raza' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: VENDOR_APPLICATION_ROLES,
    default: UserRole.VENDOR,
    description: 'Sell at retail (default) or apply as a wholesale/B2B vendor instead',
  })
  @IsOptional()
  @IsEnum(VENDOR_APPLICATION_ROLES)
  role?: (typeof VENDOR_APPLICATION_ROLES)[number];

  @ApiProperty({ example: 'Raza Sports Goods' })
  @IsString()
  @MinLength(2)
  businessName: string;

  @ApiPropertyOptional({ example: 'Sole Proprietorship' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ example: 'NTN-1234567-8' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ example: '+923001234567' })
  @IsString()
  contactPhone: string;

  @ApiProperty({ example: 'Ali Raza' })
  @IsString()
  bankAccountName: string;

  @ApiProperty({ example: 'PK00ABCD0000001234567890' })
  @IsString()
  bankAccountNumber: string;

  @ApiProperty({ example: 'Allied Bank' })
  @IsString()
  bankName: string;
}
