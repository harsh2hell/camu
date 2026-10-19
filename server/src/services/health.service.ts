import { checkDatabaseConnection } from '../lib/prisma.js';
import { config } from '../config/env.js';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  system: {
    nodeVersion: string;
    memoryUsageMb: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
  };
}

export class HealthService {
  async getHealth(): Promise<HealthCheckResult> {
    const memory = process.memoryUsage();
    const dbProbe = await checkDatabaseConnection();

    return {
      status: dbProbe.connected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: config.NODE_ENV,
      system: {
        nodeVersion: process.version,
        memoryUsageMb: {
          rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
          heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        },
      },
      database: {
        status: dbProbe.connected ? 'connected' : 'disconnected',
        ...(dbProbe.latencyMs !== undefined ? { latencyMs: dbProbe.latencyMs } : {}),
      },
    };
  }
}

export const healthService = new HealthService();
