import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectoryController } from '@/modules/directory/directory.controller';
import { DirectoryService } from '@/modules/directory/directory.service';
import { District } from '@/modules/directory/entities/district.entity';
import { Institution } from '@/modules/directory/entities/institution.entity';
import { Region } from '@/modules/directory/entities/region.entity';
import { SchoolChain } from '@/modules/directory/entities/school-chain.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Region, District, Institution, SchoolChain])],
  controllers: [DirectoryController],
  providers: [DirectoryService],
  exports: [DirectoryService],
})
export class DirectoryModule {}
