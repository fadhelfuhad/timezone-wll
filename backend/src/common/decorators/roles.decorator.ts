import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict a route or controller to one or more roles.
 * Used together with RolesGuard.
 *
 * @example
 * @Roles(Role.ADMIN, Role.MANAGER)
 * @Get('sensitive-data')
 * getSensitiveData() { ... }
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
