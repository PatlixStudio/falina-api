import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  ENTITLEMENT_CODES,
  FREE_LIMITS,
  type EntitlementCode,
  type EntitlementsView,
  type ReadingType,
  type SubscriptionTier,
  type TypeUsage,
  type UsageSnapshot,
} from '@falina/shared';
import { Reading } from '../readings/reading.entity';
import { User } from '../users/user.entity';

/** Raised when a free-tier quota is exhausted. Carries a stable machine code. */
export class QuotaExceededException extends HttpException {
  constructor(type: ReadingType, used: number, limit: number) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        code: 'LIMIT_REACHED',
        type,
        used,
        limit,
        message: `You have reached your free daily limit (${used}/${limit}). Upgrade to Premium to keep reading without limits.`,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/**
 * Monetization: tier → entitlements, free-tier daily quotas, and self-serve
 * upgrades. The backend is the source of truth; the frontend only asks
 * "does the user hold entitlement X?" / "how many free reads remain today?".
 */
@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger('EntitlementsService');

  constructor(
    @InjectRepository(Reading)
    private readonly readings: Repository<Reading>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  isPremium(user: User): boolean {
    if (user.role === 'ADMIN') {
      return true;
    }
    if (user.plan !== 'PREMIUM') {
      return false;
    }
    if (user.premiumExpiresAt && user.premiumExpiresAt.getTime() < Date.now()) {
      return false;
    }
    return true;
  }

  entitlementsFor(user: User): EntitlementCode[] {
    return this.isPremium(user) ? [...ENTITLEMENT_CODES] : [];
  }

  async usageToday(userId: string, type: ReadingType): Promise<TypeUsage> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const used = await this.readings.count({
      where: { userId, type, createdAt: MoreThanOrEqual(start) },
    });
    const limits: Record<ReadingType, number> = {
      COFFEE: FREE_LIMITS.coffeeReadingsPerDay,
      TAROT: FREE_LIMITS.tarotReadingsPerDay,
      ASTROLOGY: FREE_LIMITS.astrologyReadingsPerDay,
    };
    return { used, limit: limits[type] };
  }

  async usageAllToday(userId: string): Promise<UsageSnapshot> {
    const [coffee, tarot, astrology] = await Promise.all([
      this.usageToday(userId, 'COFFEE'),
      this.usageToday(userId, 'TAROT'),
      this.usageToday(userId, 'ASTROLOGY'),
    ]);
    return { coffee, tarot, astrology };
  }

  /** Throws 402 when a free user has exhausted their daily reads of `type`. */
  async assertQuota(user: User, type: ReadingType): Promise<void> {
    if (this.isPremium(user)) {
      return;
    }
    const usage = await this.usageToday(user.id, type);
    if (usage.used >= usage.limit) {
      throw new QuotaExceededException(type, usage.used, usage.limit);
    }
  }

  /**
   * Self-serve upgrade (stand-in for the App Store / Google Play webhook):
   * grants Premium for one billing cycle from now.
   */
  async upgrade(user: User, productId: string): Promise<EntitlementsView> {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.plan = 'PREMIUM';
    user.premiumExpiresAt = expiresAt;
    await this.users.save(user);
    this.logger.log(`User ${user.id} upgraded to PREMIUM via ${productId || 'manual'}`);
    return this.viewFor(user);
  }

  async viewFor(user: User): Promise<EntitlementsView> {
    const usage = await this.usageAllToday(user.id);
    return {
      tier: this.isPremium(user) ? 'PREMIUM' : 'FREE',
      entitlements: this.entitlementsFor(user),
      premiumUntil: user.premiumExpiresAt?.toISOString() ?? null,
      usage,
    };
  }
}
