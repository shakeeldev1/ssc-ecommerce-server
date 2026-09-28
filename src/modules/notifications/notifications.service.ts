import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@/modules/notifications/enums/notification-channel.enum';
import { NotificationEvent } from '@/modules/notifications/enums/notification-event.enum';
import { NotificationMessage } from '@/modules/notifications/interfaces/notification-message.interface';
import {
  NOTIFICATION_PROVIDER,
  NotificationProvider,
} from '@/modules/notifications/interfaces/notification-provider.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider) {}

  /**
   * Best-effort delivery: notifications are a side effect, never a gate. A
   * missing recipient is skipped, and a provider failure is logged but never
   * thrown — a checkout or status update must not fail because an SMS didn't.
   */
  async notify(message: NotificationMessage): Promise<void> {
    if (!message.recipient) return;
    try {
      await this.provider.send(message);
    } catch (error) {
      this.logger.warn(
        `Notification ${message.event} to ${message.recipient} failed: ${String(error)}`,
      );
    }
  }

  orderConfirmation(recipient: string, orderNumber: string, total: number): Promise<void> {
    return this.notify({
      channel: NotificationChannel.SMS,
      recipient,
      event: NotificationEvent.ORDER_CONFIRMATION,
      body: `Your order ${orderNumber} is confirmed. Total: PKR ${total}.`,
      data: { orderNumber, total },
    });
  }

  orderDispatched(recipient: string, orderNumber: string, trackingLink?: string): Promise<void> {
    return this.notify({
      channel: NotificationChannel.SMS,
      recipient,
      event: NotificationEvent.ORDER_DISPATCHED,
      body: `Your order ${orderNumber} has been dispatched.${trackingLink ? ` Track it: ${trackingLink}` : ''}`,
      data: { orderNumber, trackingLink },
    });
  }

  orderDelivered(recipient: string, orderNumber: string): Promise<void> {
    return this.notify({
      channel: NotificationChannel.SMS,
      recipient,
      event: NotificationEvent.ORDER_DELIVERED,
      body: `Your order ${orderNumber} has been delivered. Thank you for shopping with SSC.`,
      data: { orderNumber },
    });
  }

  refundProcessed(recipient: string, orderNumber: string, amount: number): Promise<void> {
    return this.notify({
      channel: NotificationChannel.SMS,
      recipient,
      event: NotificationEvent.REFUND_PROCESSED,
      body: `A refund of PKR ${amount} for order ${orderNumber} has been processed.`,
      data: { orderNumber, amount },
    });
  }

  cardActivated(recipient: string, cardNumber: string): Promise<void> {
    return this.notify({
      channel: NotificationChannel.SMS,
      recipient,
      event: NotificationEvent.CARD_ACTIVATION,
      body: `Your Student Smart Card ${cardNumber} is now active. Enjoy your student benefits!`,
      data: { cardNumber },
    });
  }
}
