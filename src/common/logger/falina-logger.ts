import { Injectable, Logger, LoggerService } from '@nestjs/common';

export type LogLevel = 'debug' | 'log' | 'warn' | 'error';

/**
 * Falina structured logger.
 *
 * Emits one JSON line per event with a stable requestId and no sensitive data.
 * Secrets, raw images and auth tokens must never be passed as `meta`.
 */
@Injectable()
export class FalinaLogger implements LoggerService {
  private readonly logger = new Logger('Falina');

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const line = {
      level,
      ts: new Date().toISOString(),
      msg: message,
      requestId: meta?.requestId,
      ...meta,
    };
    const serialized = JSON.stringify(line);
    switch (level) {
      case 'debug':
        this.logger.debug(serialized);
        break;
      case 'warn':
        this.logger.warn(serialized);
        break;
      case 'error':
        this.logger.error(serialized);
        break;
      default:
        this.logger.log(serialized);
    }
  }

  log(message: string, meta?: Record<string, unknown>): void {
    this.write('log', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write('error', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, meta);
  }
}
