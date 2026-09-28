/**
 * What a rule is matched against. The hierarchy tiers (school -> chain ->
 * district -> region -> head office) map 1:1 onto INSTITUTION/SCHOOL_CHAIN/
 * DISTRICT/REGION/GLOBAL — there is deliberately no separate "beneficiary
 * role" field: the scope alone determines which tier a rule fills, and
 * routing walks these five in order for every order. CAMPAIGN is a sixth,
 * independent lane for affiliate/referral-code commissions.
 */
export enum CommissionScopeType {
  GLOBAL = 'global',
  REGION = 'region',
  DISTRICT = 'district',
  INSTITUTION = 'institution',
  SCHOOL_CHAIN = 'school_chain',
  CAMPAIGN = 'campaign',
}

/** Scopes routed as school-hierarchy tiers, in walk order (most specific first). */
export const HIERARCHY_SCOPE_TYPES_IN_ORDER: readonly CommissionScopeType[] = [
  CommissionScopeType.INSTITUTION,
  CommissionScopeType.SCHOOL_CHAIN,
  CommissionScopeType.DISTRICT,
  CommissionScopeType.REGION,
  CommissionScopeType.GLOBAL,
];
