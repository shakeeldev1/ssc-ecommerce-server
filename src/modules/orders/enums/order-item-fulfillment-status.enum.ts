/** A vendor's fulfillment progress for their own line item within an order. */
export enum OrderItemFulfillmentStatus {
  PENDING = 'pending',
  PACKED = 'packed',
  SHIPPED = 'shipped',
}

/** Monotonic rank so fulfillment can only move forward (pending → packed → shipped). */
export const FULFILLMENT_RANK: Record<OrderItemFulfillmentStatus, number> = {
  [OrderItemFulfillmentStatus.PENDING]: 0,
  [OrderItemFulfillmentStatus.PACKED]: 1,
  [OrderItemFulfillmentStatus.SHIPPED]: 2,
};
