import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from './jwt-auth.guard';

/** Injects the authenticated user attached by `JwtAuthGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest<Request & { user: RequestUser }>();
    return request.user;
  },
);
