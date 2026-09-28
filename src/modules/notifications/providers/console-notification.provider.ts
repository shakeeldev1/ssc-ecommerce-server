import { Injectable, Logger } from '@nestjs/common';
import { NotificationMessage } from '@/modules/notifications/interfaces/notification-message.interface';
import { NotificationProvider } from '@/modules/notifications/interfaces/notification-provider.interface';

/** Mock provider — logs the message instead of sending it, until a real gateway is wired. */
@Injectable()
export class ConsoleNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(ConsoleNotificationProvider.name);

  send(message: NotificationMessage): Promise<void> {
    this.logger.log(
      `[${message.channel}] ${message.event} → ${message.recipient}: ${message.body}`,
    );
    return Promise.resolve();
  }
}
