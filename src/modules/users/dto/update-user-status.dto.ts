import { IsIn } from 'class-validator';
import { UserStatus } from '@/modules/users/enums/user-status.enum';

/** Statuses an admin may set on another account (not pending_verification). */
export const ADMIN_SETTABLE_USER_STATUSES: readonly UserStatus[] = [
  UserStatus.ACTIVE,
  UserStatus.SUSPENDED,
  UserStatus.BLOCKED,
];

export class UpdateUserStatusDto {
  @IsIn(ADMIN_SETTABLE_USER_STATUSES as UserStatus[])
  status: UserStatus;
}
