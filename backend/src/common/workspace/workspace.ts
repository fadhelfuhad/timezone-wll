import { AsyncLocalStorage } from 'node:async_hooks';
import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma, Workspace } from '@prisma/client';
import type { User } from '@prisma/client';
import { Observable } from 'rxjs';

/**
 * The workspace of the request being handled. Set once per request from the signed-in
 * user and read by the Prisma middleware, so services never pass it around by hand and
 * can't forget it.
 */
export const workspaceContext = new AsyncLocalStorage<{
  workspace: Workspace;
}>();

/** The current request's workspace. Throws when there is none, so nothing runs unscoped. */
export function currentWorkspace(): Workspace {
  const workspace = workspaceContext.getStore()?.workspace;
  if (!workspace) {
    throw new ForbiddenException('No workspace for this request');
  }
  return workspace;
}

/** SQL fragment for raw queries on inventory_items: `AND "workspace" = <current>`. */
export function workspaceSql(): Prisma.Sql {
  return Prisma.sql`AND "workspace" = ${currentWorkspace()}::"Workspace"`;
}

/** The guest account opened by "Continue as guest" (created by the workspaces migration). */
export const GUEST_USER_ID = '00000000-0000-4000-8000-000000000001';

export const isGuest = (user?: Pick<User, 'workspace'> | null) =>
  user?.workspace === Workspace.GUEST;

/** Runs every authenticated request inside its user's workspace. */
@Injectable()
export class WorkspaceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest<{ user?: User }>().user;
    if (!user?.workspace) {
      return next.handle();
    }
    return new Observable((subscriber) => {
      const subscription = workspaceContext.run(
        { workspace: user.workspace },
        () => next.handle().subscribe(subscriber),
      );
      return () => subscription.unsubscribe();
    });
  }
}

/** Blocks guest accounts from a route (user management, password changes). */
@Injectable()
export class NoGuestGuard {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: User }>().user;
    if (isGuest(user)) {
      throw new ForbiddenException('Not available in the guest demo');
    }
    return true;
  }
}
