import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns (or accepts and sanitizes) a request id and exposes it on the
 * request object so downstream logs/filters can correlate a single request.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = req.header(REQUEST_ID_HEADER);
    const requestId = existing && /^[\w.-]{1,64}$/.test(existing) ? existing : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, requestId);
    (req as Request & { requestId?: string }).requestId = requestId;
    next();
  }
}
