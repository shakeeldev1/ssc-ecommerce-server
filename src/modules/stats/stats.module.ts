import { Module } from '@nestjs/common';
import { CatalogModule } from '@/modules/catalog/catalog.module';
import { DirectoryModule } from '@/modules/directory/directory.module';
import { StatsController } from '@/modules/stats/stats.controller';
import { StatsService } from '@/modules/stats/stats.service';
import { StudentsModule } from '@/modules/students/students.module';
import { VendorsModule } from '@/modules/vendors/vendors.module';

@Module({
  imports: [StudentsModule, DirectoryModule, CatalogModule, VendorsModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
