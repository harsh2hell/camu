import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

// PrismaClient singleton declaration
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

/**
 * Probes database connectivity safely without leaking credentials
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    // Lightweight raw ping query
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { connected: true, latencyMs };
  } catch (err: unknown) {
    logger.warn('Database health check probe failed (database may be offline or unmigrated)', {
      errorType: err instanceof Error ? err.name : 'UnknownError',
    });
    return {
      connected: false,
      error: 'Database connection unreachable',
    };
  }
}
