export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  HEAD_OFFICE = 'head_office',
  REGIONAL_MANAGEMENT = 'regional_management',
  DISTRICT_FRANCHISE = 'district_franchise',
  SCHOOL_CHAIN_HEAD_OFFICE = 'school_chain_head_office',
  SCHOOL_INSTITUTION = 'school_institution',
  VENDOR = 'vendor',
  WHOLESALE_VENDOR = 'wholesale_vendor',
  WHOLESALE_BUYER = 'wholesale_buyer',
  STUDENT = 'student',
}

/**
 * Roles a caller may self-register as via the public /auth/register endpoint.
 * Every other role is provisioned/approved through its own module
 * (vendor onboarding in Phase 5, admin-created staff accounts in Phase 9, etc.).
 */
export const SELF_REGISTERABLE_ROLES: readonly UserRole[] = [
  UserRole.STUDENT,
  UserRole.WHOLESALE_BUYER,
];
