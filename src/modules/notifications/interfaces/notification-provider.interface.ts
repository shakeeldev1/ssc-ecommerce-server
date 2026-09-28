import { NotificationMessage } from '@/modules/notifications/interfaces/notification-message.interface';

export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

/**
 * Delivery channel for user notifications (SMS/WhatsApp/email). Real gateways
 * (Twilio, Brevo, WhatsApp Business, …) are supplied by the client later
 * (PROJECT_PLAN.md Phase 8); until then messages are served by
 * ConsoleNotificationProvider, which just logs them.
 */
export interface NotificationProvider {
  send(message: NotificationMessage): Promise<void>;
}
