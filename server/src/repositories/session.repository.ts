import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { ServiceUnavailableError } from '../errors/AppError.js';

export interface StoredSession {
  id: string;
  sessionToken: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
}

/**
 * Computes SHA-256 cryptographic hash of session token for storage.
 * The client retains the raw token; the persistence layer stores only the hash.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// In-memory session store when PostgreSQL is offline or during isolated unit testing (non-production only)
const IN_MEMORY_SESSIONS = new Map<string, StoredSession>();

export class SessionRepository {
  async createSession(params: {
    userId: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<{ sessionToken: string; expiresAt: Date }> {
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashSessionToken(rawSessionToken);

    let _dbError: unknown = null;
    // 1. Attempt Prisma creation with hashed token
    try {
      await prisma.session.create({
        data: {
          sessionToken: hashedToken,
          userId: params.userId,
          expiresAt: params.expiresAt,
          userAgent: params.userAgent ?? null,
          ipAddress: params.ipAddress ?? null,
        },
      });
      return { sessionToken: rawSessionToken, expiresAt: params.expiresAt };
    } catch (err) {
      _dbError = err;
    }

    // In production, reject silent downgrade to in-memory storage
    if (config.NODE_ENV === 'production') {
      throw new ServiceUnavailableError('Database session persistence unavailable in production');
    }

    // 2. In-memory fallback (development & test environments only)
    const session: StoredSession = {
      id: crypto.randomUUID(),
      sessionToken: hashedToken,
      userId: params.userId,
      expiresAt: params.expiresAt,
      revokedAt: null,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      createdAt: new Date(),
    };
    IN_MEMORY_SESSIONS.set(hashedToken, session);

    return { sessionToken: rawSessionToken, expiresAt: params.expiresAt };
  }

  async findSession(sessionToken: string): Promise<StoredSession | null> {
    if (!sessionToken) return null;
    const hashedToken = hashSessionToken(sessionToken);

    let dbError: unknown = null;
    // 1. Attempt Prisma query
    try {
      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: hashedToken },
      });
      if (dbSession) {
        return {
          id: dbSession.id,
          sessionToken: dbSession.sessionToken,
          userId: dbSession.userId,
          expiresAt: dbSession.expiresAt,
          revokedAt: dbSession.revokedAt,
          userAgent: dbSession.userAgent,
          ipAddress: dbSession.ipAddress,
          createdAt: dbSession.createdAt,
        };
      }
    } catch (err) {
      dbError = err;
    }

    if (config.NODE_ENV === 'production') {
      if (dbError) {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
      return null;
    }

    // 2. In-memory lookup (development & test only)
    const memSession = IN_MEMORY_SESSIONS.get(hashedToken);
    return memSession ?? null;
  }

  async revokeSession(sessionToken: string): Promise<void> {
    if (!sessionToken) return;
    const hashedToken = hashSessionToken(sessionToken);

    let dbError: unknown = null;
    try {
      await prisma.session.update({
        where: { sessionToken: hashedToken },
        data: { revokedAt: new Date() },
      });
    } catch (err) {
      dbError = err;
    }

    if (config.NODE_ENV === 'production' && dbError) {
      throw new ServiceUnavailableError('Database service unavailable in production');
    }

    const memSession = IN_MEMORY_SESSIONS.get(hashedToken);
    if (memSession) {
      memSession.revokedAt = new Date();
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    let dbError: unknown = null;
    try {
      await prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (err) {
      dbError = err;
    }

    if (config.NODE_ENV === 'production' && dbError) {
      throw new ServiceUnavailableError('Database service unavailable in production');
    }

    for (const session of IN_MEMORY_SESSIONS.values()) {
      if (session.userId === userId) {
        session.revokedAt = new Date();
      }
    }
  }

  // Clear in-memory sessions (for unit test isolation)
  clearMemoryStore(): void {
    IN_MEMORY_SESSIONS.clear();
  }
}

export const sessionRepository = new SessionRepository();

