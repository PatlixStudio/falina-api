import type { ReadingStatus, ReadingType } from '@falina/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('readings')
export class Reading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 16 })
  type: ReadingType;

  @Column({ type: 'varchar', length: 16, default: 'COMPLETED' })
  status: ReadingStatus;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ type: 'jsonb' })
  content: unknown;

  @Column({ type: 'jsonb' })
  metadata: unknown;

  @Column({ default: false })
  isFavorite: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
