export enum VendorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
  DEACTIVATED = 'deactivated',
}

export const ALLOWED_VENDOR_STATUS_TRANSITIONS: Readonly<
  Record<VendorStatus, readonly VendorStatus[]>
> = {
  [VendorStatus.PENDING]: [VendorStatus.APPROVED, VendorStatus.REJECTED],
  [VendorStatus.APPROVED]: [VendorStatus.SUSPENDED, VendorStatus.BLOCKED, VendorStatus.DEACTIVATED],
  [VendorStatus.SUSPENDED]: [VendorStatus.APPROVED, VendorStatus.BLOCKED, VendorStatus.DEACTIVATED],
  [VendorStatus.REJECTED]: [],
  [VendorStatus.BLOCKED]: [],
  [VendorStatus.DEACTIVATED]: [VendorStatus.APPROVED],
};
