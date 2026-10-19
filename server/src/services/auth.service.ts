import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { passwordService } from './password.service.js';
import { config } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';
import type { LoginInput, SafeUser, AuthSessionData } from '../types/auth.js';
import { logger } from '../lib/logger.js';

export class AuthService {
  async login(
    input: LoginInput,
    metadata: { userAgent?: string | null; ipAddress?: string | null }
  ): Promise<AuthSessionData> {
    // 1. Fetch user by email, roll number, or employee ID
    const user = await userRepository.findByIdentifier(input.identifier);
    if (!user) {
      logger.warn('Failed login attempt: User identifier not found');
      // Generic message to prevent user enumeration
      throw new UnauthorizedError('Invalid credentials');
    }

    // 2. Check account active status
    if (!user.isActive) {
      logger.warn('Failed login attempt: Inactive account', { userId: user.id });
      throw new ForbiddenError('Account is deactivated. Please contact the university administrator.');
    }

    // 3. Verify role match if client requested a specific portal mode (e.g. teacher vs student)
    if (input.expectedRole && user.role !== input.expectedRole) {
      logger.warn('Failed login attempt: Role mismatch', {
        userId: user.id,
        userRole: user.role,
        expectedRole: input.expectedRole,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // 4. Verify password hash securely
    const isPasswordValid = await passwordService.verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn('Failed login attempt: Incorrect password', { userId: user.id });
      throw new UnauthorizedError('Invalid credentials');
    }

    // 5. Update last login timestamp asynchronously
    await userRepository.updateLastLogin(user.id);

    // 6. Create server-managed session
    const maxAgeMs = config.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + maxAgeMs);

    const { sessionToken } = await sessionRepository.createSession({
      userId: user.id,
      expiresAt,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });

    const safeUser = userRepository.toSafeUser(user);

    logger.info('Successful authentication', {
      userId: safeUser.id,
      role: safeUser.role,
    });

    return {
      user: safeUser,
      sessionToken,
      expiresAt,
    };
  }

  async logout(sessionToken?: string): Promise<void> {
    if (sessionToken) {
      await sessionRepository.revokeSession(sessionToken);
    }
  }

  async validateSession(sessionToken?: string): Promise<SafeUser | null> {
    if (!sessionToken) return null;

    const session = await sessionRepository.findSession(sessionToken);
    if (!session) return null;

    // Check revocation
    if (session.revokedAt !== null) {
      return null;
    }

    // Check expiration
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    // Verify user status
    const user = await userRepository.findById(session.userId);
    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }
}

export const authService = new AuthService();
