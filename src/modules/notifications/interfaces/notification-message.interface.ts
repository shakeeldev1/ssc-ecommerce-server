import { NotificationChannel } from '@/modules/notifications/enums/notification-channel.enum';
import { NotificationEvent } from '@/modules/notifications/enums/notification-event.enum';

export interface NotificationMessage {
  channel: NotificationChannel;
  /** Phone number or email address, depending on the channel. */
  recipient: string;
  event: NotificationEvent;
  body: string;
  /** Optional structured context (order number, tracking link, amount, …). */
  data?: Record<string, unknown>;
}
