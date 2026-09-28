/** The notification events called for in the functional scope (§13). */
export enum NotificationEvent {
  REGISTRATION = 'registration',
  CARD_ACTIVATION = 'card_activation',
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_DISPATCHED = 'order_dispatched',
  ORDER_DELIVERED = 'order_delivered',
  REFUND_PROCESSED = 'refund_processed',
  SECURITY_ALERT = 'security_alert',
}
