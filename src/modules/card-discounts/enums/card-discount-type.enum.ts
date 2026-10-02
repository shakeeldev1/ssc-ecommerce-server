/**
 * How a card-holder discount is expressed:
 * - `percent`: a percentage off the eligible subtotal (optionally capped).
 * - `fixed`: a flat PKR amount off the order (e.g. "200 off"), never more
 *   than the eligible subtotal.
 */
export enum CardDiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}
