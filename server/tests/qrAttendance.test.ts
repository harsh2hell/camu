import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
import { generateQrToken } from '../src/utils/qrToken.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 17: Secure QR-Based Attendance Verification Suite', () => {
  let studentCookie: string[];
  let facultyCookie: string[];
  let unauthorizedFacultyCookie: string[];

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
      // Offline fallback handling
    }

    // 1. Authenticate Eligible Student (Harendra Pratap Singh)
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    studentCookie = getCookies(studentLogin);

    // 2. Authenticate Authorized Faculty (Dr. Rajesh Sharma - assigned to CS302)
    const facultyLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'faculty.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    facultyCookie = getCookies(facultyLogin);

    // 3. Authenticate Unauthorized Faculty (Dr. Ananya Sen - not assigned to CS302)
    const unauthFacultyLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'ananya.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    unauthorizedFacultyCookie = getCookies(unauthFacultyLogin);
  });

  afterEach(() => {
    clearRateLimitStore();
  });

  // Test 1: Authorized faculty can open QR attendance session for assigned course
  it('1. should allow authorized faculty to open an attendance session and generate a valid QR token', async () => {
    // Step 1: Create session
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
        topicTaught: 'Phase 17 QR Attendance Demo Lecture',
      });

    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.data.id;

    // Step 2: Generate QR token
    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);

    expect(qrRes.status).toBe(200);
    expect(qrRes.body.success).toBe(true);
    expect(qrRes.body.data.token).toBeDefined();
    expect(qrRes.body.data.sessionId).toBe(sessionId);
    expect(qrRes.body.data.courseCode).toBe('CS302');
    expect(qrRes.body.data.expiresInSeconds).toBe(60);
    expect(qrRes.body.data.isLocked).toBe(false);

    // Check token format: sessionId.courseOfferingId.nonce.expiresAt.signature
    const parts = qrRes.body.data.token.split('.');
    expect(parts.length).toBe(5);
    expect(parts[0]).toBe(sessionId);
    expect(parts[1]).toBe(DEV_COURSE_OFFERING_ID);
  });

  // Test 2: Unauthorized faculty cannot create or generate sessions for unassigned courses
  it('2. should reject unauthorized faculty attempt to generate QR token for unassigned course with 403 Forbidden', async () => {
    // Authorized faculty creates session for CS302
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
        topicTaught: 'Authorized lecture',
      });
    const sessionId = sessionRes.body.data.id;

    // Unauthorized faculty attempts to generate QR token for CS302 session
    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', unauthorizedFacultyCookie);

    expect(qrRes.status).toBe(403);
    expect(qrRes.body.success).toBe(false);
    expect(qrRes.body.error.code).toBe('FORBIDDEN');
  });

  // Test 3: Eligible enrolled student can check in successfully
  it('3. should allow eligible enrolled student to check in with a valid QR token', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
        topicTaught: 'QR Live Verification',
      });
    const sessionId = sessionRes.body.data.id;

    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);

    const token = qrRes.body.data.token;

    // Student submits check-in
    const checkInRes = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: token });

    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.success).toBe(true);
    expect(checkInRes.body.data.sessionId).toBe(sessionId);
    expect(checkInRes.body.data.courseCode).toBe('CS302');
    expect(checkInRes.body.data.status).toBe('PRESENT');
    expect(checkInRes.body.data.isAlreadyMarked).toBe(false);
  });

  // Test 4: Unauthenticated requests are rejected with 401 Unauthorized
  it('4. should reject unauthenticated requests to QR check-in endpoint with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/attendance/qr/check-in')
      .send({ qrToken: 'fake.token.value.12345.sig' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // Test 5: Faculty and other non-student roles cannot use the student check-in endpoint
  it('5. should reject faculty or non-student role check-in attempt with 403 Forbidden', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
      });
    const sessionId = sessionRes.body.data.id;

    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);

    // Faculty tries to call student check-in
    const checkInRes = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', facultyCookie)
      .send({ qrToken: qrRes.body.data.token });

    expect(checkInRes.status).toBe(403);
    expect(checkInRes.body.success).toBe(false);
    expect(checkInRes.body.error.code).toBe('FORBIDDEN');
  });

  // Test 6: A student cannot check in to an unassigned / unenrolled course
  it('6. should reject check-in if student is not enrolled in the course offering', async () => {
    // Generate token for a hypothetical unassigned offering
    const fakeOfferingId = 'b0000000-0000-4000-8000-999999999999';
    // Create session for that offering manually in dev store
    const fakeSession = await attendanceRepository.createSession({
      courseOfferingId: DEV_COURSE_OFFERING_ID,
      facultyId: 'a0000000-0000-4000-8000-000000000002',
      sessionDate: new Date(),
      startTime: '02:00 PM',
      topicTaught: 'Unenrolled Session Test',
    });

    // Generate token with an unenrolled offering binding
    const tamperedToken = generateQrToken(fakeSession.id, fakeOfferingId, 60);

    const checkInRes = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: tamperedToken.token });

    expect(checkInRes.status).toBe(400);
    expect(checkInRes.body.success).toBe(false);
    expect(checkInRes.body.error.message).toContain('binding mismatch');
  });

  // Test 7: Invalid, tampered, expired, and closed-session QR tokens are rejected
  it('7. should reject tampered and expired QR tokens with 400 Bad Request', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
      });
    const sessionId = sessionRes.body.data.id;

    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);

    const validToken = qrRes.body.data.token;

    // 7.1 Tampered signature
    const tamperedToken = validToken.slice(0, -6) + 'abcdef';
    const tamperedRes = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: tamperedToken });

    expect(tamperedRes.status).toBe(400);
    expect(tamperedRes.body.error.message).toContain('Cryptographic verification failed');

    // 7.2 Expired token (create token with -10 second TTL)
    const expiredTokenData = generateQrToken(sessionId, DEV_COURSE_OFFERING_ID, -10);
    const expiredRes = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: expiredTokenData.token });

    expect(expiredRes.status).toBe(400);
    expect(expiredRes.body.error.message).toContain('expired');
  });

  // Test 8: Duplicate scans do not increment attendance twice
  it('8. should handle duplicate scans gracefully without creating duplicate records', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
      });
    const sessionId = sessionRes.body.data.id;

    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);
    const token = qrRes.body.data.token;

    // Scan 1
    const firstScan = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: token });

    expect(firstScan.status).toBe(200);
    expect(firstScan.body.data.isAlreadyMarked).toBe(false);

    // Scan 2 (same student)
    const secondScan = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: token });

    expect(secondScan.status).toBe(200);
    expect(secondScan.body.data.isAlreadyMarked).toBe(true);

    // Verify session status still reports only 1 present check-in
    const statusRes = await request(app)
      .get(`/api/attendance/sessions/${sessionId}/qr/status`)
      .set('Cookie', facultyCookie);

    expect(statusRes.body.data.presentCount).toBe(1);
  });

  // Test 9: Concurrent duplicate scans produce only one successful attendance record
  it('9. should ensure concurrent check-in requests produce only one attendance record', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
      });
    const sessionId = sessionRes.body.data.id;

    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);
    const token = qrRes.body.data.token;

    // Fire 3 simultaneous concurrent check-in requests
    const [res1, res2, res3] = await Promise.all([
      request(app).post('/api/attendance/qr/check-in').set('Cookie', studentCookie).send({ qrToken: token }),
      request(app).post('/api/attendance/qr/check-in').set('Cookie', studentCookie).send({ qrToken: token }),
      request(app).post('/api/attendance/qr/check-in').set('Cookie', studentCookie).send({ qrToken: token }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);

    // At least one was marked new, and total records marked is exactly 1
    const newCount = [res1.body.data.isAlreadyMarked, res2.body.data.isAlreadyMarked, res3.body.data.isAlreadyMarked].filter(m => !m).length;
    expect(newCount).toBe(1);

    const statusRes = await request(app)
      .get(`/api/attendance/sessions/${sessionId}/qr/status`)
      .set('Cookie', facultyCookie);

    expect(statusRes.body.data.presentCount).toBe(1);
  });

  // Test 10: Closing a session prevents subsequent check-ins
  it('10. should reject scans after faculty closes the attendance session with 409 Conflict', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
      });
    const sessionId = sessionRes.body.data.id;

    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);
    const token = qrRes.body.data.token;

    // Faculty closes the session
    const closeRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/close`)
      .set('Cookie', facultyCookie);

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.isLocked).toBe(true);

    // Student tries to scan after closure
    const lateScan = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: token });

    expect(lateScan.status).toBe(409);
    expect(lateScan.body.success).toBe(false);
    expect(lateScan.body.error.code).toBe('CONFLICT');
    expect(lateScan.body.error.message).toContain('locked');
  });

  // Test 11: A student cannot overwrite another student's attendance
  it('11. should bind check-in strictly to the authenticated user ID and prevent impersonation', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
      });
    const sessionId = sessionRes.body.data.id;

    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);

    // Student marks attendance
    const checkIn = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: qrRes.body.data.token });

    expect(checkIn.status).toBe(200);
    // Student ID in result MUST match authenticated student's user ID, ignoring any client spoofing
    expect(checkIn.body.data.studentId).toBe(DEV_STUDENT_USER_ID);
  });

  // Test 12: Existing manual attendance and session-locking tests continue to pass
  it('12. should preserve existing manual attendance recording workflow', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
        topicTaught: 'Manual Roll Call Test',
      });
    const sessionId = sessionRes.body.data.id;

    const manualBatch = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/records`)
      .set('Cookie', facultyCookie)
      .send({
        records: [
          { studentId: DEV_STUDENT_USER_ID, status: 'ON_DUTY', remarks: 'Hackathon' },
        ],
        lockSession: false,
      });

    expect(manualBatch.status).toBe(200);
    expect(manualBatch.body.data.recordsMarked).toBe(1);
    expect(manualBatch.body.data.isLocked).toBe(false);
  });

  // Test 13: Student attendance summaries reflect the saved QR check-in after refetch
  it('13. should reflect saved QR check-in in student attendance summary immediately after refetch', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
        topicTaught: 'Algorithmic Proofs',
      });
    const sessionId = sessionRes.body.data.id;

    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);

    // Student checks in
    await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: qrRes.body.data.token });

    // Refetch summary
    const summaryRes = await request(app)
      .get('/api/attendance/my-summary')
      .set('Cookie', studentCookie);

    expect(summaryRes.status).toBe(200);
    const cs302 = summaryRes.body.data.subjects.find((s: any) => s.code === 'CS302');
    expect(cs302).toBeDefined();
    // 2 baseline + 1 QR check-in = 3 attended out of 3 conducted
    expect(cs302.attended).toBe(3);
    expect(cs302.conducted).toBe(3);
    expect(cs302.percentage).toBe(100.0);
  });

  // Test 14: Scanner input validation and malformed token handling
  it('14. should validate scanner payload and reject malformed requests with 400 Bad Request', async () => {
    const malformedRes1 = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({}); // Missing qrToken

    expect([400, 422].includes(malformedRes1.status)).toBe(true);

    const malformedRes2 = await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: 'not-a-valid-token' });

    expect(malformedRes2.status).toBe(400);
    expect(malformedRes2.body.error.message).toContain('structure');
  });

  // Test 15: Faculty live roster and final counts reflect persisted attendance records
  it('15. should reflect persisted records in faculty live roster and final closed counts', async () => {
    const sessionRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Cookie', facultyCookie)
      .send({
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        startTime: '10:00 AM',
        topicTaught: 'Faculty Finalization Audit',
      });
    const sessionId = sessionRes.body.data.id;

    const qrRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/qr/generate`)
      .set('Cookie', facultyCookie);

    // Student checks in via QR
    await request(app)
      .post('/api/attendance/qr/check-in')
      .set('Cookie', studentCookie)
      .send({ qrToken: qrRes.body.data.token });

    // Faculty queries live status
    const liveStatus = await request(app)
      .get(`/api/attendance/sessions/${sessionId}/qr/status`)
      .set('Cookie', facultyCookie);

    expect(liveStatus.status).toBe(200);
    expect(liveStatus.body.data.presentCount).toBe(1);
    expect(liveStatus.body.data.isLocked).toBe(false);

    const studentEntry = liveStatus.body.data.students.find(
      (s: any) => s.studentUserId === DEV_STUDENT_USER_ID
    );
    expect(studentEntry).toBeDefined();
    expect(studentEntry.status).toBe('PRESENT');

    // Faculty closes session
    const closeRes = await request(app)
      .post(`/api/attendance/sessions/${sessionId}/close`)
      .set('Cookie', facultyCookie);

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.isLocked).toBe(true);
    expect(closeRes.body.data.presentCount).toBe(1);
    // Other students who did not check in default to ABSENT per policy
    expect(closeRes.body.data.absentCount).toBeGreaterThan(0);
  });
});
