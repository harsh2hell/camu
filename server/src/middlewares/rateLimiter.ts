import type { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../errors/AppError.js';

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// In-memory buckets for IP and account identifier rate limiting
const ipAttempts = new Map<string, AttemptRecord>();
const accountAttempts = new Map<string, AttemptRecord>();

const WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window
const MAX_IP_ATTEMPTS = 15;        // 15 attempts per IP per 15 mins
const MAX_ACCOUNT_FAILURES = 5;    // 5 failed attempts per account per 15 mins
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15-minute temporary lockout

/**
 * Login abuse protection rate limiter middleware
 */
export function loginRateLimiter(req: Request, _res: Response, next: NextFunction): void {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const identifier = (req.body?.identifier ? String(req.body.identifier).trim().toLowerCase() : null);

  // 1. Check IP-level limits
  const ipRecord = ipAttempts.get(ip);
  if (ipRecord) {
    if (ipRecord.blockedUntil && now < ipRecord.blockedUntil) {
      const waitMins = Math.ceil((ipRecord.blockedUntil - now) / 60000);
      return next(
        new TooManyRequestsError(
          `Too many requests from this IP address. Please try again in ${waitMins} minute(s).`
        )
      );
    }
    // Reset window if expired
    if (now - ipRecord.firstAttempt > WINDOW_MS) {
      ipAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
      ipRecord.count += 1;
      if (ipRecord.count > MAX_IP_ATTEMPTS) {
        ipRecord.blockedUntil = now + BLOCK_DURATION_MS;
        return next(
          new TooManyRequestsError(
            'Too many login attempts from this network. Please try again in 15 minutes.'
          )
        );
      }
    }
  } else {
    ipAttempts.set(ip, { count: 1, firstAttempt: now });
  }

  // 2. Check Account-level limits (repeated failed attempts against single student/faculty)
  if (identifier) {
    const accRecord = accountAttempts.get(identifier);
    if (accRecord) {
      if (accRecord.blockedUntil && now < accRecord.blockedUntil) {
        const waitMins = Math.ceil((accRecord.blockedUntil - now) / 60000);
        return next(
          new TooManyRequestsError(
            `Too many failed attempts for this account. Account is temporarily locked. Try again in ${waitMins} minute(s).`
          )
        );
      }
      if (now - accRecord.firstAttempt > WINDOW_MS) {
        accountAttempts.set(identifier, { count: 1, firstAttempt: now });
      }
    }
  }

  next();
}

/**
 * Records a failed login attempt for an account identifier to prevent credential stuffing
 */
export function recordLoginFailure(identifier: string): void {
  const now = Date.now();
  const idKey = identifier.trim().toLowerCase();
  const record = accountAttempts.get(idKey);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    accountAttempts.set(idKey, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
    if (record.count >= MAX_ACCOUNT_FAILURES) {
      record.blockedUntil = now + BLOCK_DURATION_MS;
    }
  }
}

/**
 * Clears failed attempt counter upon successful authentication
 */
export function recordLoginSuccess(identifier: string): void {
  const idKey = identifier.trim().toLowerCase();
  accountAttempts.delete(idKey);
}

/**
 * Resets all rate limit stores (for testing and isolation)
 */
export function clearRateLimitStore(): void {
  ipAttempts.clear();
  accountAttempts.clear();
}
