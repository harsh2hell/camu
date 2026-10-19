import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { config } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';
import type { UserRole } from '@prisma/client';

/**
 * Extracts session token from HTTP-only cookie or fallback Authorization Bearer header
 */
export function extractSessionToken(req: Request): string | undefined {
  if (req.cookies && req.cookies[config.SESSION_COOKIE_NAME]) {
    return req.cookies[config.SESSION_COOKIE_NAME];
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return undefined;
}

/**
 * Authentication Middleware: Enforces valid active server session
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication required. No session provided.');
    }

    const user = await authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedError('Session is invalid or has expired. Please sign in again.');
    }

    req.user = user;
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Authorization Middleware: Enforces Role-Based Access Control (RBAC) on the server
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access restricted: User role '${req.user.role}' is not authorized for this resource.`
        )
      );
    }

    next();
  };
}
