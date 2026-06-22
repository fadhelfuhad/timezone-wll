import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<{ headersSent?: boolean }>();

    return next.handle().pipe(
      map((data: T): SuccessResponse<T> => {
        // Raw-response routes (@Res() without passthrough) send headers themselves
        // and return undefined — skip wrapping to avoid ERR_HTTP_HEADERS_SENT
        if (data === undefined || data === null || res.headersSent) {
          return data as unknown as SuccessResponse<T>;
        }
        return {
          success: true,
          data: JSON.parse(JSON.stringify(data)) as T,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
