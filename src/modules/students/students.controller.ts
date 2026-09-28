import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { CreateAddressDto } from '@/modules/students/dto/create-address.dto';
import { UpdateAddressDto } from '@/modules/students/dto/update-address.dto';
import { UpdateStudentProfileDto } from '@/modules/students/dto/update-student-profile.dto';
import { Address } from '@/modules/students/entities/address.entity';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';
import { StudentsService } from '@/modules/students/students.service';
import { UserRole } from '@/modules/users/enums/user-role.enum';

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@ApiTags('students')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('students/me')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: "Get the current student's profile" })
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<StudentProfile> {
    return this.studentsService.findOrCreateForUser(user.id);
  }

  @Patch()
  @ApiOperation({ summary: "Update the current student's profile" })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStudentProfileDto,
  ): Promise<StudentProfile> {
    return this.studentsService.updateProfile(user.id, dto);
  }

  @Post('photo')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload/replace the profile photo' })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<StudentProfile> {
    if (!file) {
      throw new BadRequestException('A "photo" file is required');
    }
    if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Photo must be a JPEG, PNG or WEBP image');
    }

    return this.studentsService.uploadPhoto(user.id, file.buffer);
  }

  @Get('addresses')
  @ApiOperation({ summary: "List the current student's addresses" })
  listAddresses(@CurrentUser() user: AuthenticatedUser): Promise<Address[]> {
    return this.studentsService.listAddresses(user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new address' })
  createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ): Promise<Address> {
    return this.studentsService.createAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update an address' })
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<Address> {
    return this.studentsService.updateAddress(user.id, addressId, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  async deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') addressId: string,
  ): Promise<void> {
    await this.studentsService.deleteAddress(user.id, addressId);
  }
}
