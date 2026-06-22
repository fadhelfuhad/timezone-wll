import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        err?.message ?? 'Authentication required. Please provide a valid token.',
      );
    }

    return user;
  }
}
