import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { District } from '@/modules/directory/entities/district.entity';
import { Institution } from '@/modules/directory/entities/institution.entity';
import { Region } from '@/modules/directory/entities/region.entity';
import { SchoolChain } from '@/modules/directory/entities/school-chain.entity';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';
import { UsersModule } from '@/modules/users/users.module';
import { CommissionEntriesController } from '@/modules/commission/commission-entries.controller';
import { CommissionEntriesService } from '@/modules/commission/commission-entries.service';
import { CommissionRulesController } from '@/modules/commission/commission-rules.controller';
import { CommissionRulesService } from '@/modules/commission/commission-rules.service';
import { CommissionService } from '@/modules/commission/commission.service';
import { CommissionEntry } from '@/modules/commission/entities/commission-entry.entity';
import { CommissionRule } from '@/modules/commission/entities/commission-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommissionRule,
      CommissionEntry,
      Region,
      District,
      Institution,
      SchoolChain,
      StudentProfile,
    ]),
    UsersModule,
    AuditLogModule,
  ],
  controllers: [CommissionRulesController, CommissionEntriesController],
  providers: [CommissionRulesService, CommissionEntriesService, CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
