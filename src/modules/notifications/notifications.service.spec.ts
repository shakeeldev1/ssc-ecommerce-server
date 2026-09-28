import { NotificationChannel } from '@/modules/notifications/enums/notification-channel.enum';
import { NotificationEvent } from '@/modules/notifications/enums/notification-event.enum';
import { NotificationProvider } from '@/modules/notifications/interfaces/notification-provider.interface';
import { NotificationsService } from '@/modules/notifications/notifications.service';

const serviceWith = (send: NotificationProvider['send']) =>
  new NotificationsService({ send } as NotificationProvider);

describe('NotificationsService', () => {
  it('sends a well-formed message via the provider', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await serviceWith(send).orderConfirmation('+923001234567', 'ORD-1', 500);

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.event).toBe(NotificationEvent.ORDER_CONFIRMATION);
    expect(message.recipient).toBe('+923001234567');
    expect(message.body).toContain('ORD-1');
  });

  it('skips delivery when the recipient is empty', async () => {
    const send = vi.fn();
    await serviceWith(send).notify({
      channel: NotificationChannel.SMS,
      recipient: '',
      event: NotificationEvent.ORDER_DELIVERED,
      body: 'x',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('never throws when the provider fails (best-effort)', async () => {
    const send = vi.fn().mockRejectedValue(new Error('gateway down'));
    await expect(serviceWith(send).cardActivated('+923001234567', 'CARD-1')).resolves.toBeUndefined();
  });
});
