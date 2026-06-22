import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';

export type RequestWithUser = Request & { user: User };

/**
 * Parameter decorator that extracts the authenticated user from the request.
 * Requires a JWT auth guard to be applied first so that `request.user` is populated.
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 *
 * // Extract a specific field
 * @Get('me')
 * getMe(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext): User | User[keyof User] => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (field) {
      return user?.[field];
    }

    return user;
  },
);
