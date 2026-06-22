import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - startTime;
          const statusCode = response.statusCode;

          if (!response.headersSent) {
            response.setHeader('X-Response-Time', `${elapsed}ms`);
          }

          this.logger.log(
            `${method} ${url} ${statusCode} - ${elapsed}ms`,
            LoggingInterceptor.name,
          );
        },
        error: (err: unknown) => {
          const elapsed = Date.now() - startTime;
          const statusCode =
            (err as { status?: number })?.status ?? 500;

          if (!response.headersSent) {
            response.setHeader('X-Response-Time', `${elapsed}ms`);
          }

          this.logger.error(
            `${method} ${url} ${statusCode} - ${elapsed}ms`,
            err instanceof Error ? err.stack : String(err),
            LoggingInterceptor.name,
          );
        },
      }),
    );
  }
}
