import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ERROR_CODES, type ErrorCode } from '@falina/shared';

export interface ApiErrorBody {
  statusCode: number;
  error: ErrorCode;
  message: string;
  requestId?: string;
}

/**
 * Global exception filter. Converts every error into the stable ApiErrorBody
 * shape, never leaks internals, and always attaches the request id.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = (req as Request & { requestId?: string }).requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ErrorCode = ERROR_CODES.INTERNAL_ERROR;
    let message = 'Something unexpected happened.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const raw = body as { error?: string; message?: string | string[] };
        if (typeof raw.message === 'string') {
          message = raw.message;
        } else if (Array.isArray(raw.message)) {
          message = raw.message.join(', ');
        }
        error = this.mapStatusToCode(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `${req.method} ${req.originalUrl} -> ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const body: ApiErrorBody = { statusCode: status, error, message };
    if (requestId) {
      body.requestId = requestId;
    }
    res.status(status).json(body);
  }

  private mapStatusToCode(status: number): ErrorCode {
    return (
      HTTP_STATUS_TO_CODE[status] ??
      (status >= 500 ? ERROR_CODES.INTERNAL_ERROR : ERROR_CODES.VALIDATION_FAILED)
    );
  }
}

const HTTP_STATUS_TO_CODE: Record<number, ErrorCode> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMITED,
};
