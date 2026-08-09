import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { FalinaLogger } from '../logger/falina-logger';
import { REQUEST_ID_HEADER } from '../logger/request-id.middleware';

/**
 * Logs one line per HTTP request with method, path, status and duration.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: FalinaLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const requestId = (req as Request & { requestId?: string }).requestId ?? 'no-request-id';
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log('request complete', {
            requestId,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            durationMs: Date.now() - started,
          }),
        error: (err: Error & { status?: number }) =>
          this.logger.error('request failed', {
            requestId,
            method: req.method,
            path: req.path,
            status: err.status ?? 500,
            durationMs: Date.now() - started,
            error: err.name,
            requestIdHeader: REQUEST_ID_HEADER,
          }),
      }),
    );
  }
}
