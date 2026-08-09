import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  checks?: Record<string, 'ok' | 'error'>;
}

/**
 * Liveness / readiness probes.
 *
 * - `GET /health`      — process is alive.
 * - `GET /health/ready` — process is ready (database reachable).
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  check(): HealthStatus {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks database connectivity)' })
  async ready(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: { database: 'ok' },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: { database: 'error' },
      });
    }
  }
}
