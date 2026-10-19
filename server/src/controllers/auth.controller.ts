import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { extractSessionToken } from '../middlewares/auth.middleware.js';
import { config } from '../config/env.js';
import type { ApiResponse } from '../types/api.js';
import type { SafeUser, LoginInput } from '../types/auth.js';
import { recordLoginSuccess, recordLoginFailure } from '../middlewares/rateLimiter.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    const input: LoginInput = req.body;
    try {
      const metadata = {
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      };

      const { user, sessionToken, expiresAt } = await authService.login(input, metadata);

      // Record successful login (clears failure counters for this account)
      recordLoginSuccess(input.identifier);

      // Set secure HTTP-only cookie
      res.cookie(config.SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
      });

      const response: ApiResponse<{ user: SafeUser; token: string }> = {
        success: true,
        data: {
          user,
          token: sessionToken,
        },
        message: 'Authentication successful',
      };

      res.status(200).json(response);
    } catch (err) {
      if (input?.identifier) {
        recordLoginFailure(input.identifier);
      }
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = extractSessionToken(req);
      await authService.logout(token);

      // Clear HTTP-only session cookie
      res.clearCookie(config.SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'Session terminated successfully',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const response: ApiResponse<{ user: SafeUser }> = {
        success: true,
        data: { user },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
