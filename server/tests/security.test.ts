import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { sessionRepository, hashSessionToken } from '../src/repositories/session.repository.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { config } from '../src/config/env.js';


describe('Phase 2 Security Verification & Hardening Suite', () => {
  beforeEach(() => {
    sessionRepository.clearMemoryStore();
    clearRateLimitStore();
  });

  afterEach(() => {
    clearRateLimitStore();
  });

  // 1. Production Fixture Rejection
  it('SEC-1: should strictly reject development fixture accounts when NODE_ENV is production', async () => {
    const originalEnv = config.NODE_ENV;
    try {
      (config as any).NODE_ENV = 'production';

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'student.dev@dgu.ac.in',
          password: 'Password@Dev123',
        });

      // In production, when database is offline, it must fail safely (503 Service Unavailable or 401),
      // and NEVER succeed (200) with fixture data!
      expect(res.status).not.toBe(200);
      expect(res.body.success).toBe(false);
      expect(['SERVICE_UNAVAILABLE', 'UNAUTHORIZED']).toContain(res.body.error.code);
    } finally {
      (config as any).NODE_ENV = originalEnv;
    }
  });

  // 2. Production Session Downgrade Prevention
  it('SEC-2: should reject silent session downgrade to in-memory store in production when DB is offline', async () => {
    const originalEnv = config.NODE_ENV;
    try {
      (config as any).NODE_ENV = 'production';

      await expect(
        sessionRepository.createSession({
          userId: 'test-user-id',
          expiresAt: new Date(Date.now() + 3600000),
        })
      ).rejects.toThrowError(/Database session persistence unavailable in production/);
    } finally {
      (config as any).NODE_ENV = originalEnv;
    }
  });

  // 3. Login Rate Limiting (Account Level - Brute Force Protection)
  it('SEC-3: should throttle repeated failed login attempts for an account with 429 Too Many Requests', async () => {
    const targetAccount = 'student.dev@dgu.ac.in';

    // 5 consecutive wrong password attempts
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: targetAccount,
          password: `WrongPassword_${i}!`,
        });
      expect(res.status).toBe(401);
    }

    // 6th attempt should be blocked by rate limiter
    const blockedRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: targetAccount,
        password: 'Password@Dev123', // Even with the right password, account is temporarily locked
      });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blockedRes.body.error.message).toContain('temporarily locked');
  });

  // 4. CORS Rejection of Unapproved Origin
  it('SEC-4: should reject requests from unapproved origin with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://malicious-attacker-website.com')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('not allowed by CORS policy');
  });

  // 5. Approved CORS Subdomains & University Origins
  it('SEC-5: should permit valid university domains and subdomains', async () => {
    const allowedOrigins = [
      'https://student.autonex.studio',
      'https://teacher.autonex.studio',
      'https://dgu.ac.in',
      'http://localhost:5173',
    ];

    for (const origin of allowedOrigins) {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    }
  });

  // 6. Cryptographic Hashing of Session Tokens
  it('SEC-6: should store only cryptographic SHA-256 hashes of session tokens in session repository', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    expect(loginRes.status).toBe(200);
    const rawToken = loginRes.body.data.token;
    expect(rawToken).toBeDefined();

    // Verify rawToken is NOT the key in the stored session map
    const expectedHash = hashSessionToken(rawToken);
    expect(expectedHash).not.toBe(rawToken);

    // Look up in session repository should find it via hash
    const stored = await sessionRepository.findSession(rawToken);
    expect(stored).not.toBeNull();
    expect(stored?.sessionToken).toBe(expectedHash);
  });

  // 7. Invalid Cookie & Session Handling
  it('SEC-7: should reject garbage / tampered session cookies with 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`${config.SESSION_COOKIE_NAME}=forged_session_token_1234567890abcdef`]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
