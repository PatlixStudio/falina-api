import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  /** `access` by default; `refresh` tokens must never satisfy this guard. */
  type?: 'access' | 'refresh';
}

export interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches a
 * `RequestUser` to the request. Access tokens only — refresh tokens are
 * rejected.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.type === 'refresh') {
        throw new UnauthorizedException('Refresh tokens cannot be used for access');
      }
      (request as Request & { user: RequestUser }).user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    return null;
  }
}
