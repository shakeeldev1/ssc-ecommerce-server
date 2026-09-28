import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@/modules/users/enums/user-role.enum';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. Requires RolesGuard to be active. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
