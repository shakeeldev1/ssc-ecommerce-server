export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cod',
  /** Stands in for a real payment gateway until Phase 8 wires one in — always "succeeds". */
  ONLINE_STUB = 'online_stub',
}
