export enum CommissionEntryStatus {
  EARNED = 'earned',
  HELD = 'held',
  ZEROED = 'zeroed',
  /** Reserved for Phase 7's return-window reversal logic; not produced yet. */
  REVERSED = 'reversed',
}
