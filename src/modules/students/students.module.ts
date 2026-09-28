import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectoryModule } from '@/modules/directory/directory.module';
import { MediaModule } from '@/modules/media/media.module';
import { Address } from '@/modules/students/entities/address.entity';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';
import { StudentsController } from '@/modules/students/students.controller';
import { StudentsService } from '@/modules/students/students.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudentProfile, Address]), DirectoryModule, MediaModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
