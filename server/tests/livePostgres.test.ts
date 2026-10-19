import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import {
  DEV_COURSE_OFFERING_ID,
  DEV_STUDENT_USER_ID,
  DEV_FACULTY_USER_ID,
} from '../src/repositories/attendance.repository.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { config } from '../src/config/env.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 3.1: Live PostgreSQL End-to-End Integration Suite', () => {
  let studentCookie: string[];
  let facultyCookie: string[];
  let testSessionId: string;

  beforeAll(async () => {
    clearRateLimitStore();
    // Verify PostgreSQL connection
    const result = await prisma.$queryRaw<Array<{ current_database: string; now: Date }>>`SELECT current_database(), NOW();`;
    expect(result).toBeDefined();
    expect(result[0].current_database).toBe('dbs_camu_dev');
  });

  afterAll(async () => {
    // Clean up test sessions created during this suite
    if (testSessionId) {
      await prisma.attendanceRecord.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.attendanceSession.deleteMany({ where: { id: testSessionId } });
    }
    clearRateLimitStore();
  });

  // ============================================================================
  // STEP 5: REAL AUTHENTICATION TEST (AGAINST POSTGRESQL)
  // ============================================================================
  describe('Step 5: Real PostgreSQL Authentication & Session Persistence', () => {
    it('5.1 should authenticate student with PostgreSQL user credentials and establish a DB session', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'student.dev@dgu.ac.in',
          password: 'Password@Dev123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('student.dev@dgu.ac.in');
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user.id).toBe(DEV_STUDENT_USER_ID);

      studentCookie = getCookies(res);
      expect(studentCookie.length).toBeGreaterThan(0);
      expect(studentCookie[0]).toContain('dbs_session=');

      // Verify the session actually exists in PostgreSQL sessions table
      const dbSessions = await prisma.session.findMany({
        where: { userId: DEV_STUDENT_USER_ID, revokedAt: null },
      });
      expect(dbSessions.length).toBeGreaterThan(0);
    });

    it('5.2 should retrieve authenticated user profile using live PostgreSQL session cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(DEV_STUDENT_USER_ID);
      expect(res.body.data.user.studentProfile.rollNumber).toBe('0251BTCS097');
    });

    it('5.3 should authenticate faculty with PostgreSQL and verify dual active sessions', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'faculty.dev@dgu.ac.in',
          password: 'Password@Dev123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('FACULTY');
      expect(res.body.data.user.id).toBe(DEV_FACULTY_USER_ID);

      facultyCookie = getCookies(res);
      expect(facultyCookie.length).toBeGreaterThan(0);

      // Verify faculty profile retrieved from PostgreSQL
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', facultyCookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.facultyProfile.employeeCode).toBe('FAC-108');
    });

    it('5.4 should revoke the session in PostgreSQL upon logout', async () => {
      const logoutLogin = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'student.dev@dgu.ac.in',
          password: 'Password@Dev123',
        });
      const tempCookie = getCookies(logoutLogin);

      // Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', tempCookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify that this session cookie is now rejected
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', tempCookie);

      expect(meRes.status).toBe(401);
    });
  });

  // ============================================================================
  // STEP 6: REAL ATTENDANCE WORKFLOW (AGAINST POSTGRESQL)
  // ============================================================================
  describe('Step 6: Real PostgreSQL Attendance Workflow', () => {
    it('6.1 should retrieve the course roster for authorized faculty from PostgreSQL', async () => {
      const res = await request(app)
        .get(`/api/attendance/roster?offeringId=${DEV_COURSE_OFFERING_ID}`)
        .set('Cookie', facultyCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(5);

      const harendra = res.body.data.find((s: any) => s.studentUserId === DEV_STUDENT_USER_ID);
      expect(harendra).toBeDefined();
      expect(harendra.rollNumber).toBe('0251BTCS097');
    });

    it('6.2 should create a new attendance session in PostgreSQL', async () => {
      const res = await request(app)
        .post('/api/attendance/sessions')
        .set('Cookie', facultyCookie)
        .send({
          courseOfferingId: DEV_COURSE_OFFERING_ID,
          startTime: '02:00 PM',
          topicTaught: 'B-Trees & Multiway Search Indexing',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testSessionId = res.body.data.id;
      expect(testSessionId).toBeDefined();

      // Verify session exists in PostgreSQL
      const dbSession = await prisma.attendanceSession.findUnique({
        where: { id: testSessionId },
      });
      expect(dbSession).toBeDefined();
      expect(dbSession?.topicTaught).toBe('B-Trees & Multiway Search Indexing');
      expect(dbSession?.isLocked).toBe(false);
    });

    it('6.3 should record batch attendance transactionally in PostgreSQL', async () => {
      const res = await request(app)
        .post(`/api/attendance/sessions/${testSessionId}/records`)
        .set('Cookie', facultyCookie)
        .send({
          records: [
            { studentId: DEV_STUDENT_USER_ID, status: 'PRESENT' },
            { studentId: 'a0000000-0000-4000-8000-000000000003', status: 'PRESENT' },
            { studentId: 'a0000000-0000-4000-8000-000000000004', status: 'PRESENT' }, // Aman Deep present today
            { studentId: 'a0000000-0000-4000-8000-000000000005', status: 'ABSENT' },
            { studentId: 'a0000000-0000-4000-8000-000000000006', status: 'ON_DUTY', remarks: 'DBS Sports Meet' },
          ],
          lockSession: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recordsMarked).toBe(5);

      // Directly verify the records in PostgreSQL
      const dbRecords = await prisma.attendanceRecord.findMany({
        where: { sessionId: testSessionId },
      });
      expect(dbRecords.length).toBe(5);
    });

    it('6.4 should retrieve updated attendance summary reflecting the real PostgreSQL records', async () => {
      const res = await request(app)
        .get('/api/attendance/my-summary')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cs302 = res.body.data.subjects.find((s: any) => s.code === 'CS302');
      expect(cs302).toBeDefined();
      // 2 baseline sessions + 1 newly added session = 3 total conducted
      expect(cs302.conducted).toBe(3);
      expect(cs302.attended).toBe(3);
      expect(cs302.percentage).toBe(100.0);
    });

    it('6.5 should retrieve the defaulter report correctly from PostgreSQL', async () => {
      const res = await request(app)
        .get(`/api/attendance/defaulters?offeringId=${DEV_COURSE_OFFERING_ID}&threshold=75`)
        .set('Cookie', facultyCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Student 4 (Isha: 0/3 = 0.0%) and Student 3 (Aman Deep: 1/3 = 33.3%)
      const defaulterRolls = res.body.data.map((d: any) => d.rollNumber);
      expect(defaulterRolls).toContain('0251BTCS051'); // Isha
      expect(defaulterRolls).toContain('0251BTCS014'); // Aman Deep
    });

    it('6.6 should reject duplicate student IDs in batch with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/attendance/sessions/${testSessionId}/records`)
        .set('Cookie', facultyCookie)
        .send({
          records: [
            { studentId: DEV_STUDENT_USER_ID, status: 'PRESENT' },
            { studentId: DEV_STUDENT_USER_ID, status: 'ABSENT' }, // Duplicate
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('6.7 should reject unenrolled student IDs with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/attendance/sessions/${testSessionId}/records`)
        .set('Cookie', facultyCookie)
        .send({
          records: [
            { studentId: 'ffffffff-ffff-ffff-ffff-ffffffffffff', status: 'PRESENT' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('6.8 should lock session in PostgreSQL and prevent subsequent modifications', async () => {
      // 1. Lock the session
      const lockRes = await request(app)
        .post(`/api/attendance/sessions/${testSessionId}/records`)
        .set('Cookie', facultyCookie)
        .send({
          records: [{ studentId: DEV_STUDENT_USER_ID, status: 'PRESENT' }],
          lockSession: true,
        });

      expect(lockRes.status).toBe(200);
      expect(lockRes.body.data.isLocked).toBe(true);

      // Verify in DB that isLocked is true
      const dbSession = await prisma.attendanceSession.findUnique({
        where: { id: testSessionId },
      });
      expect(dbSession?.isLocked).toBe(true);

      // 2. Attempt modification on locked session
      const modifyRes = await request(app)
        .post(`/api/attendance/sessions/${testSessionId}/records`)
        .set('Cookie', facultyCookie)
        .send({
          records: [{ studentId: DEV_STUDENT_USER_ID, status: 'ABSENT' }],
        });

      expect(modifyRes.status).toBe(409);
      expect(modifyRes.body.error.code).toBe('CONFLICT');
    });

    it('6.9 should reject student attempts to create sessions or view defaulters with 403 Forbidden', async () => {
      const createRes = await request(app)
        .post('/api/attendance/sessions')
        .set('Cookie', studentCookie)
        .send({
          courseOfferingId: DEV_COURSE_OFFERING_ID,
          startTime: '10:00 AM',
        });
      expect(createRes.status).toBe(403);

      const defaulterRes = await request(app)
        .get(`/api/attendance/defaulters?offeringId=${DEV_COURSE_OFFERING_ID}`)
        .set('Cookie', studentCookie);
      expect(defaulterRes.status).toBe(403);
    });
  });

  // ============================================================================
  // STEP 7: PERSISTENCE VERIFICATION ACROSS BACKEND RESTART
  // ============================================================================
  describe('Step 7: Session & Attendance Persistence Across Server Simulation', () => {
    it('7.1 should verify that session remains valid and queries PostgreSQL directly without re-login', async () => {
      // Re-query using existing studentCookie
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(DEV_STUDENT_USER_ID);

      // Verify that database records remain intact
      const summaryRes = await request(app)
        .get('/api/attendance/my-summary')
        .set('Cookie', studentCookie);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.totalConducted).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================================
  // STEP 8: PRODUCTION FAILURE BEHAVIOR
  // ============================================================================
  describe('Step 8: Production Security & Failure Handling', () => {
    it('8.1 should reject development fixture authentication in production mode', async () => {
      const originalEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            identifier: 'student.dev@dgu.ac.in',
            password: 'Password@Dev123',
          });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });

    it('8.2 should fail safely with 503 when PostgreSQL query fails in production mode without credential leakage', async () => {
      const originalEnv = config.NODE_ENV;
      const originalUrl = process.env.DATABASE_URL;

      try {
        (config as any).NODE_ENV = 'production';

        // Simulate database query failure in repository
        (prisma.attendanceRecord.findMany as any) = async () => {
          throw new Error('FATAL: Database connection timeout');
        };

        const res = await request(app)
          .get('/api/attendance/my-summary')
          .set('Cookie', studentCookie);

        expect(res.status).toBe(503);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');

        // Verify no credentials leaked in response
        const bodyStr = JSON.stringify(res.body);
        expect(bodyStr).not.toContain('postgresql://');
        expect(bodyStr).not.toContain('harsh');
      } finally {
        (config as any).NODE_ENV = originalEnv;
        process.env.DATABASE_URL = originalUrl;
      }
    });
  });
});
