import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '@/modules/audit-log/entities/audit-log.entity';
import { AuditLogController } from '@/modules/audit-log/audit-log.controller';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
