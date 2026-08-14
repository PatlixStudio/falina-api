import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { SubscriptionTier } from '@falina/shared';

export type UserRole = 'USER' | 'ADMIN';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ default: '' })
  displayName: string;

  @Column({ type: 'varchar', length: 16, default: 'USER' })
  role: UserRole;

  /** Monetization tier; drives entitlements and free-tier quotas. */
  @Column({ type: 'varchar', length: 16, default: 'FREE' })
  plan: SubscriptionTier;

  @Column({ type: 'timestamptz', nullable: true })
  premiumExpiresAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
