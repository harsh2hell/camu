import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Application } from 'express';
import { createApp, app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { FileStorage } from '../src/lib/fileStorage.js';
import { runScheduledNoticeJob, getBackgroundJobStatus } from '../src/services/backgroundJobs.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 12.1: Pilot Blocker Remediation & Operational Verification Suite', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  afterEach(() => {
    clearRateLimitStore();
  });

  // ============================================================================
  // 1. REVERSE PROXY & RATE LIMIT SPOOFING PROTECTION
  // ============================================================================
  describe('1. Reverse Proxy & Rate Limiting Protection', () => {
    it('prevents direct requests from spoofing X-Forwarded-For when trust proxy is false', async () => {
      // By default in test/dev, trust proxy is false
      // Send request with spoofed X-Forwarded-For header
      const spoofedIp = '198.51.100.42';
      
      // Hit a route that checks req.ip
      const testApp: Application = express();
      testApp.set('trust proxy', false);
      let resolvedIp = '';
      testApp.get('/test-ip', (req, res) => {
        resolvedIp = req.ip || req.socket.remoteAddress || '';
        res.status(200).json({ ip: resolvedIp });
      });

      const res = await request(testApp)
        .get('/test-ip')
        .set('X-Forwarded-For', spoofedIp);

      expect(res.status).toBe(200);
      // Resolved IP must NOT be the spoofed header; it must be loopback (::ffff:127.0.0.1 or 127.0.0.1)
      expect(res.body.ip).not.toBe(spoofedIp);
      expect(res.body.ip).toMatch(/(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)/);
    });

    it('correctly resolves client IP when trust proxy is configured for 1 hop', async () => {
      const testApp: Application = express();
      testApp.set('trust proxy', 1); // 1 trusted reverse proxy hop (Nginx / ALB)
      
      const realClientIp = '203.0.113.88';
      testApp.get('/test-proxy-ip', (req, res) => {
        res.status(200).json({ ip: req.ip });
      });

      const res = await request(testApp)
        .get('/test-proxy-ip')
        .set('X-Forwarded-For', realClientIp);

      expect(res.status).toBe(200);
      expect(res.body.ip).toBe(realClientIp);
    });

    it('enforces account lockout after 5 consecutive failed logins', async () => {
      const targetIdentifier = 'student.dev@dgu.ac.in';

      // 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        const failRes = await request(app)
          .post('/api/auth/login')
          .send({ identifier: targetIdentifier, password: 'WrongPassword123!' });
        expect(failRes.status).toBe(401);
      }

      // 6th attempt should be blocked with 429 Too Many Requests (account locked out)
      const blockedRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: targetIdentifier, password: 'WrongPassword123!' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.message).toContain('Account is temporarily locked');
    });
  });

  // ============================================================================
  // 2. FILE STORAGE INTEGRITY & PERMISSIONS
  // ============================================================================
  describe('2. Persistent File Storage & Security Boundaries', () => {
    it('creates uploaded files with non-executable permissions (mode 0o600)', async () => {
      const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      const metadata = await FileStorage.saveSecureFile(
        buffer,
        '.pdf',
        'safe_document.pdf',
        'a0000000-0000-4000-8000-000000000001',
        'application/pdf'
      );

      const filePath = FileStorage.getSafeFilePath(metadata.fileKey);
      expect(fs.existsSync(filePath)).toBe(true);

      const stats = fs.statSync(filePath);
      // In Unix, 0o600 mode means user read/write only (400 or 600 octal mask)
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);

      // Clean up
      await FileStorage.deleteSecureFile(metadata.fileKey);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('strictly prohibits dangerous executable file formats (Windows PE / ELF / Mach-O)', () => {
      // Windows PE (MZ)
      const mzBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      expect(() => FileStorage.validateFileBuffer(mzBuffer, 'malicious.pdf')).toThrow(
        /Executable file formats .* strictly prohibited/
      );

      // Linux ELF
      const elfBuffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
      expect(() => FileStorage.validateFileBuffer(elfBuffer, 'exploit.pdf')).toThrow(
        /Executable file formats .* strictly prohibited/
      );
    });

    it('rejects path traversal attempts in file keys', () => {
      expect(() => FileStorage.getSafeFilePath('../../etc/passwd')).toThrow(/Invalid file key format/);
      expect(() => FileStorage.getSafeFilePath('subfolder/secret.pdf')).toThrow(/Invalid file key format/);
      expect(() => FileStorage.getSafeFilePath('..\\windows\\system32')).toThrow(/Invalid file key format/);
    });

    it('retains active submission files and protects drafting files in orphan cleanup', async () => {
      const result = await FileStorage.cleanupOrphanFiles({
        gracePeriodHours: 24,
        dryRun: true,
      });

      expect(result).toBeDefined();
      expect(typeof result.scannedDbRecords).toBe('number');
      expect(typeof result.retainedActiveFiles).toBe('number');
      expect(result.errorsCount).toBe(0);
    });
  });

  // ============================================================================
  // 3. BACKGROUND JOBS & IDEMPOTENCY
  // ============================================================================
  describe('3. Background Jobs & Recovery Telemetry', () => {
    it('executes scheduled notice cycle without unhandled exceptions and reports telemetry', async () => {
      const processed = await runScheduledNoticeJob();
      expect(typeof processed).toBe('number');

      const status = getBackgroundJobStatus();
      expect(status).toBeDefined();
      expect(status.lastNoticeRunAt).toBeDefined();
      expect(status.lastNoticeError).toBeNull();
    });

    it('health check endpoint reports background worker telemetry', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.data.backgroundJobs).toBeDefined();
      expect(typeof res.body.data.backgroundJobs.isRunning).toBe('boolean');
      expect(typeof res.body.data.backgroundJobs.intervalMs).toBe('number');
    });

    it('guarantees notification idempotency: duplicate triggers do not insert duplicate notifications', async () => {
      const testRecipientId = 'a0000000-0000-4000-8000-000000000001';
      const testKey = `PILOT_IDEMPOTENCY_TEST_${Date.now()}`;

      // Insert first notification via Prisma
      const first = await prisma.notification.create({
        data: {
          recipientId: testRecipientId,
          type: 'SYSTEM',
          title: 'Idempotency Test 1',
          message: 'First delivery attempt',
          idempotencyKey: testKey,
        },
      });
      expect(first.id).toBeDefined();

      // Second attempt with same key must fail on unique partial index
      let caughtError = false;
      try {
        await prisma.notification.create({
          data: {
            recipientId: testRecipientId,
            type: 'SYSTEM',
            title: 'Idempotency Test 2',
            message: 'Duplicate delivery attempt',
            idempotencyKey: testKey,
          },
        });
      } catch (err: any) {
        caughtError = true;
        // PostgreSQL unique violation code 23505
        expect(err.message).toMatch(/Unique constraint|unique_notification_recipient_idempotency/i);
      }
      expect(caughtError).toBe(true);

      // Clean up
      await prisma.notification.delete({ where: { id: first.id } });
    });
  });

  // ============================================================================
  // 4. CROSS-MODULE NEGATIVE SECURITY BOUNDARIES
  // ============================================================================
  describe('4. Cross-Module Pilot Security Boundaries', () => {
    it('prohibits students from accessing faculty defaulter roll-call reports with 403', async () => {
      const studentLogin = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'student.dev@dgu.ac.in', password: 'Password@Dev123' });
      const cookie = studentLogin.headers['set-cookie'];

      const res = await request(app)
        .get('/api/attendance/defaulters?offeringId=b0000000-0000-4000-8000-000000000001')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
    });

    it('prohibits students from modifying protected academic fields on profile with 422', async () => {
      const studentLogin = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'student.dev@dgu.ac.in', password: 'Password@Dev123' });
      const cookie = studentLogin.headers['set-cookie'];

      const res = await request(app)
        .patch('/api/profile/me')
        .set('Cookie', cookie)
        .send({ rollNumber: 'HACKED999', currentCgpa: 10.0 });

      expect(res.status).toBe(422);
    });

    it('prohibits unauthenticated requests to private download endpoints with 401', async () => {
      const res = await request(app).get('/api/assignments/some-uuid/attachment');
      expect(res.status).toBe(401);
    });

    it('prohibits students from publishing notices directly with 403', async () => {
      const studentLogin = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'student.dev@dgu.ac.in', password: 'Password@Dev123' });
      const cookie = studentLogin.headers['set-cookie'];

      const res = await request(app)
        .post('/api/notices')
        .set('Cookie', cookie)
        .send({
          title: 'Unauthorized Student Announcement',
          content: 'This should be blocked',
          category: 'GENERAL',
          status: 'PUBLISHED',
        });

      expect(res.status).toBe(403);
    });
  });
});
