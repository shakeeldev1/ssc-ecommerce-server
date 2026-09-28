import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '@/config/configuration';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CardActivationController } from '@/modules/card-activation/card-activation.controller';
import { CardActivationService } from '@/modules/card-activation/card-activation.service';
import {
  STUDENT_SYNC_PROVIDER,
  StudentSyncProvider,
} from '@/modules/card-activation/interfaces/student-sync-provider.interface';
import { HttpStudentSyncProvider } from '@/modules/card-activation/providers/http-student-sync.provider';
import { MockStudentSyncProvider } from '@/modules/card-activation/providers/mock-student-sync.provider';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { SmartCardsModule } from '@/modules/smart-cards/smart-cards.module';
import { StudentsModule } from '@/modules/students/students.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [
    UsersModule,
    StudentsModule,
    SmartCardsModule,
    AuthModule,
    AuditLogModule,
    NotificationsModule,
  ],
  controllers: [CardActivationController],
  providers: [
    CardActivationService,
    HttpStudentSyncProvider,
    MockStudentSyncProvider,
    {
      provide: STUDENT_SYNC_PROVIDER,
      inject: [ConfigService, HttpStudentSyncProvider, MockStudentSyncProvider],
      useFactory: (
        configService: ConfigService<Configuration, true>,
        httpProvider: HttpStudentSyncProvider,
        mockProvider: MockStudentSyncProvider,
      ): StudentSyncProvider => {
        const { baseUrl, apiKey } = configService.get('externalStudentSystem', { infer: true });
        return baseUrl && apiKey ? httpProvider : mockProvider;
      },
    },
  ],
})
export class CardActivationModule {}
