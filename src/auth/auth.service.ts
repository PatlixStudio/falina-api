import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcryptjs';
import { SafeUser, UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { JwtPayload } from './jwt-auth.guard';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds (used by clients to pre-empt expiry). */
  expiresIn: number;
  tokenType: 'Bearer';
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, displayName?: string): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.usersService.create(email, password, displayName ?? '');
    return this.buildResult(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildResult(user);
  }

  /** Rotates a refresh token into a fresh access + refresh pair. */
  async refresh(refreshToken: string): Promise<AuthResult> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Not a refresh token');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return this.buildResult(user);
  }

  private async buildResult(user: User): Promise<AuthResult> {
    const base: Pick<JwtPayload, 'sub' | 'email' | 'role'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessExpires = this.config.get<string>('JWT_EXPIRES_IN', '15m');
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...base, type: 'access' },
        { expiresIn: accessExpires as StringValue },
      ),
      this.jwtService.signAsync(
        { ...base, type: 'refresh' },
        { expiresIn: refreshExpires as StringValue },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: parseDurationSeconds(accessExpires),
      tokenType: 'Bearer',
      user: this.usersService.toSafeUser(user),
    };
  }
}

/** Converts JWT-style durations (`15m`, `30d`, `900`) to whole seconds. */
export function parseDurationSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
  if (!match) {
    return 900;
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit] ?? 1);
}
