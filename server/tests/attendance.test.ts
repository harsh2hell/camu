import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import {
  attendanceRepository,
  DEV_COURSE_OFFERING_ID,
  DEV_STUDENT_USER_ID,
} from '../src/repositories/attendance.repository.js';
import { sessionRepository } from '../src/repositories/session.repository.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { config } from '../src/config/env.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 3: Attendance & Academic Persistence Suite', () => {
  let studentCookie: string[];
  let facultyCookie: string[];

  beforeEach(async () => {
    sessionRepository.clearMemoryStore();
    clearRateLimitStore();
    attendanceRepository.clearDevStore();

    try {
      await prisma.attendanceSession.deleteMany({
        where: {
          id: {
            notIn: [
              'c0000000-0000-4000-8000-000000000001',
              'c0000000-0000-4000-8000-000000000002',
            ],
          },
        },
      });
    } catch {
      // ignore if DB is offline during unit testing
    }

    // 1. Authenticate Student
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    studentCookie = getCookies(studentLogin);

    // 2. Authenticate Faculty
    const facultyLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'faculty.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    facultyCookie = getCookies(facultyLogin);
  });

  afterEach(() => {
    clearRateLimitStore();
  });

  // 1. Student Attendance Summary
  it('1. should allow student to retrieve their own attendance summary with accurate calculations', async () => {
    const res = await request(app)
      .get('/api/attendance/my-summary')
      .set('Cookie', studentCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overallPercentage).toBeDefined();
    expect(res.body.data.totalConducted).toBeGreaterThan(0);
    expect(res.body.data.subjects.length).toBeGreaterThan(0);

    const cs302 = res.body.data.subjects.find((s: any) => s.code === 'CS302');
    expect(cs302).toBeDefined();
    expect(cs302.attended).toBe(2);
    expect(cs302.conducted).toBe(2);
    expect(cs302.percentage).toBe(100.0);
    expect(cs302.status).toBe('safe');
  });

  // 2. Student cannot modify attendance
  it('2. should reject student attempt to create an attendance session with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', studentCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
        topicTaught: 'Unauthorized student session',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 3. Faculty session creation
  it('3. should allow authorized faculty to create an attendance session', async () => {
    const res = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '11:00 AM',
        topicTaught: 'Dynamic Programming: 0/1 Knapsack',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.courseCode).toBe('CS302');
    expect(res.body.data.topicTaught).toBe('Dynamic Programming: 0/1 Knapsack');
    expect(res.body.data.isLocked).toBe(false);
  });

  // 4. Batch attendance recording by authorized faculty
  it('4. should allow faculty to record attendance batch for enrolled students', async () => {
    // 1. Create session
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
        topicTaught: 'Graph Algorithms: Shortest Paths',
      });
    const sessionId = sessionRes.body.data.id;

    // 2. Record batch
    const recordRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/records`)
      .set('Cookie', facultyCookie)
      .send({
        records: [
          { studentId: DEV_STUDENT_USER_ID, status: 'PRESENT' },
          { studentId: 'dev-student-uuid-002', status: 'PRESENT' },
          { studentId: 'dev-student-uuid-003', status: 'ABSENT' },
        ],
        lockSession: true,
      });

    expect(recordRes.status).toBe(200);
    expect(recordRes.body.success).toBe(true);
    expect(recordRes.body.data.recordsMarked).toBe(3);
    expect(recordRes.body.data.isLocked).toBe(true);

    // 3. Verify student summary is immediately updated
    const updatedSummaryRes = await request(app)
      .get('/api/attendance/my-summary')
      .set('Cookie', studentCookie);

    const cs302 = updatedSummaryRes.body.data.subjects.find((s: any) => s.code === 'CS302');
    expect(cs302.conducted).toBe(3); // 2 baseline + 1 new
    expect(cs302.attended).toBe(3);
    expect(cs302.percentage).toBe(100.0);
  });

  // 5. Reject batch containing unenrolled students
  it('5. should reject batch containing unenrolled students with 400 Bad Request', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
      });
    const sessionId = sessionRes.body.data.id;

    const recordRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/records`)
      .set('Cookie', facultyCookie)
      .send({
        records: [
          { studentId: 'completely-fake-unenrolled-student-uuid', status: 'PRESENT' },
        ],
      });

    expect(recordRes.status).toBe(400);
    expect(recordRes.body.success).toBe(false);
    expect(recordRes.body.error.code).toBe('BAD_REQUEST');
    expect(recordRes.body.error.message).toContain('not enrolled');
  });

  // 6. Reject batch with duplicate student entries
  it('6. should reject batch payload containing duplicate student IDs with 400 Bad Request', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
      });
    const sessionId = sessionRes.body.data.id;

    const recordRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/records`)
      .set('Cookie', facultyCookie)
      .send({
        records: [
          { studentId: DEV_STUDENT_USER_ID, status: 'PRESENT' },
          { studentId: DEV_STUDENT_USER_ID, status: 'ABSENT' }, // Duplicate entry
        ],
      });

    expect(recordRes.status).toBe(400);
    expect(recordRes.body.success).toBe(false);
    expect(recordRes.body.error.code).toBe('BAD_REQUEST');
    expect(recordRes.body.error.message).toContain('Duplicate student ID');
  });

  // 7. Prevent modifying locked session
  it('7. should prevent modifying locked attendance sessions with 409 Conflict', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
      });
    const sessionId = sessionRes.body.data.id;

    // Lock session
    await request(app)
      .post(`/api/attendance/sessions/${sessionId}/records`)
      .set('Cookie', facultyCookie)
      .send({
        records: [{ studentId: DEV_STUDENT_USER_ID, status: 'PRESENT' }],
        lockSession: true,
      });

    // Attempt second write on locked session
    const conflictRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/records`)
      .set('Cookie', facultyCookie)
      .send({
        records: [{ studentId: DEV_STUDENT_USER_ID, status: 'ABSENT' }],
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error.code).toBe('CONFLICT');
    expect(conflictRes.body.error.message).toContain('locked');
  });

  // 8. Defaulter report retrieval
  it('8. should allow faculty to retrieve defaulters list for their course offering', async () => {
    const res = await request(app)
      .get(`/api/attendance/defaulters?offeringId=${DEV_COURSE_OFFERING_ID}`)
      .set('Cookie', facultyCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // In baseline dev data, students 003, 004, 005 are absent in both baseline classes (0%)
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    for (const d of res.body.data) {
      expect(d.percentage).toBeLessThan(75.0);
    }
  });

  // 9. Students cannot view defaulter reports
  it('9. should reject student attempt to view defaulter report with 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/attendance/defaulters?offeringId=${DEV_COURSE_OFFERING_ID}`)
      .set('Cookie', studentCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 10. Production fixture isolation
  it('10. should strictly reject attendance fixture fallback in production mode when DB is offline', async () => {
    const originalEnv = config.NODE_ENV;
    const findManySpy = vi
      .spyOn(prisma.attendanceRecord, 'findMany')
      .mockRejectedValueOnce(new Error('PostgreSQL Offline (Simulation)'));

    try {
      (config as any).NODE_ENV = 'production';

      const res = await request(app)
        .get('/api/attendance/my-summary')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    } finally {
      findManySpy.mockRestore();
      (config as any).NODE_ENV = originalEnv;
    }
  });
});
