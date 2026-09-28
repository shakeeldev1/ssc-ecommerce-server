import { Module } from '@nestjs/common';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { ConsoleNotificationProvider } from '@/modules/notifications/providers/console-notification.provider';
import { NOTIFICATION_PROVIDER } from '@/modules/notifications/interfaces/notification-provider.interface';

@Module({
  providers: [
    NotificationsService,
    { provide: NOTIFICATION_PROVIDER, useClass: ConsoleNotificationProvider },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
