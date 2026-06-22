import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body['message'] as string | string[]) ?? exception.message;
        error = (body['error'] as string) ?? exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }

      // Only log 5xx errors as errors; 4xx are warnings
      if (statusCode >= 500) {
        this.logger.error(
          `HTTP ${statusCode} ${request.method} ${request.url}: ${JSON.stringify(message)}`,
          exception instanceof Error ? exception.stack : undefined,
          AllExceptionsFilter.name,
        );
      } else {
        this.logger.warn(
          `HTTP ${statusCode} ${request.method} ${request.url}: ${JSON.stringify(message)}`,
          AllExceptionsFilter.name,
        );
      }
    } else {
      // Unhandled / unexpected errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'Internal Server Error';
      message = 'An unexpected error occurred';

      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${stack}`,
        undefined,
        AllExceptionsFilter.name,
      );
    }

    const body: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }
}
