/**
 * Maps the scope doc's "enable/disable/hold/suspend/bypass/zero" onto four
 * distinct behaviors (disable/suspend/bypass all mean "skip this rule
 * entirely" — there's no meaningfully different behavior between them for
 * routing purposes, so they collapse to one state):
 *  - ACTIVE: computes and pays normally.
 *  - DISABLED: the rule is skipped as if it didn't exist — no entry is created.
 *  - ON_HOLD: still computed and recorded, but the entry is marked HELD (withheld pending release).
 *  - ZEROED: still recorded for audit purposes, but the computed amount is forced to 0.
 */
export enum CommissionRuleStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  ON_HOLD = 'on_hold',
  ZEROED = 'zeroed',
}
