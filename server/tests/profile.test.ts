import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { sessionRepository } from '../src/repositories/session.repository.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 9: Student Profile & Academic Records Suite', () => {
  let student1Cookie: string[];
  let student2Cookie: string[];
  let faculty1Cookie: string[];
  let faculty2Cookie: string[];
  let adminCookie: string[];

  const STUDENT1_USER_ID = 'a0000000-0000-4000-8000-000000000001';
  let STUDENT1_PROFILE_ID: string;
  const STUDENT2_USER_ID = 'a0000000-0000-4000-8000-000000000003';
  let STUDENT2_PROFILE_ID: string;

  beforeEach(async () => {
    sessionRepository.clearMemoryStore();
    clearRateLimitStore();

    // Dynamically lookup profile IDs from authoritative database
    const s1Profile = await prisma.studentProfile.findUnique({
      where: { userId: STUDENT1_USER_ID },
    });
    STUDENT1_PROFILE_ID = s1Profile!.id;

    const s2Profile = await prisma.studentProfile.findUnique({
      where: { userId: STUDENT2_USER_ID },
    });
    STUDENT2_PROFILE_ID = s2Profile!.id;

    // Clean up audit logs created during test runs (TRUNCATE bypasses row-level immutability trigger)
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE profile_audit_logs CASCADE;');
    } catch {
      // ignore
    }

    // Reset student profile editable fields to baseline
    await prisma.user.update({
      where: { id: STUDENT1_USER_ID },
      data: { phone: '+91 98765 43210' },
    });
    await prisma.studentProfile.update({
      where: { id: STUDENT1_PROFILE_ID },
      data: {
        personalEmail: null,
        emergencyContact: '+91 98765 00000',
        bloodGroup: 'B+',
        guardianName: 'Dev Guardian',
        addressLine: '124 Rajpur Road',
        city: 'Dehradun',
        state: 'Uttarakhand',
        pincode: '248001',
      },
    });

    // Authenticate Student 1 (Harendra Pratap Singh - Mentee of Dr. Rajesh Sharma)
    const s1Res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'student.dev@dgu.ac.in', password: 'Password@Dev123' });
    student1Cookie = getCookies(s1Res);

    // Authenticate Student 2 (Aaditya Verma - Mentee of Dr. Vivek Bhatt)
    const s2Res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'aaditya.dev@dgu.ac.in', password: 'Password@Dev123' });
    student2Cookie = getCookies(s2Res);

    // Authenticate Faculty 1 (Dr. Rajesh Sharma)
    const f1Res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'faculty.dev@dgu.ac.in', password: 'Password@Dev123' });
    faculty1Cookie = getCookies(f1Res);

    // Authenticate Faculty 2 (Dr. Vivek Bhatt)
    const f2Res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'vivek.dev@dgu.ac.in', password: 'Password@Dev123' });
    faculty2Cookie = getCookies(f2Res);

    // Authenticate Admin (Registrar Admin)
    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin.dev@dgu.ac.in', password: 'Password@Dev123' });
    adminCookie = getCookies(aRes);
  });

  afterEach(async () => {
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE profile_audit_logs CASCADE;');
    } catch {
      // ignore
    }
  });

  describe('1. Authentication & Session Validation', () => {
    it('rejects unauthenticated requests to GET /api/profile/me with 401', async () => {
      const res = await request(app).get('/api/profile/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated requests to PATCH /api/profile/me with 401', async () => {
      const res = await request(app)
        .patch('/api/profile/me')
        .send({ phone: '+91 99999 88888' });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to GET /api/profile/academic-records with 401', async () => {
      const res = await request(app).get('/api/profile/academic-records');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to GET /api/profile/mentees with 401', async () => {
      const res = await request(app).get('/api/profile/mentees');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to GET /api/profile/students/:studentId with 401', async () => {
      const res = await request(app).get(`/api/profile/students/${STUDENT1_PROFILE_ID}`);
      expect(res.status).toBe(401);
    });
  });

  describe('2. Student Profile Read & Anti-IDOR Authorization', () => {
    it('allows a student to view their own profile with full authoritative relationships', async () => {
      const res = await request(app)
        .get('/api/profile/me')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.rollNumber).toBe('0251BTCS097');
      expect(data.registrationNo).toBe('DBS25UG25234');
      expect(data.fullName).toContain('Harendra Pratap Singh');
      expect(data.email).toBe('student.dev@dgu.ac.in');
      expect(data.currentSemester).toBe(3);
      expect(data.currentCgpa).toBe(8.64);
      expect(data.program.name).toContain('Computer Science');
      expect(data.department.name).toContain('School of Engineering');
      expect(data.mentor).toBeDefined();
      expect(data.mentor?.fullName).toContain('Dr. Rajesh Sharma');
    });

    it('allows a student to access their own profile via GET /api/profile/students/:ownId', async () => {
      const res = await request(app)
        .get(`/api/profile/students/${STUDENT1_PROFILE_ID}`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(STUDENT1_PROFILE_ID);
    });

    it('strictly prevents a student from accessing another student profile via IDOR (returns 403 Forbidden)', async () => {
      // Student 1 tries to access Student 2's profile
      const res = await request(app)
        .get(`/api/profile/students/${STUDENT2_PROFILE_ID}`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects student attempting to access faculty mentee list with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/profile/mentees')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Scoped Faculty & Staff Access Control', () => {
    it('allows faculty to fetch their assigned mentees', async () => {
      const res = await request(app)
        .get('/api/profile/mentees')
        .set('Cookie', faculty1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const menteeIds = res.body.data.map((m: any) => m.id);
      expect(menteeIds).toContain(STUDENT1_PROFILE_ID);
    });

    it('allows faculty mentor to view their assigned mentee profile', async () => {
      // Dr. Rajesh Sharma is mentor for Student 1
      const res = await request(app)
        .get(`/api/profile/students/${STUDENT1_PROFILE_ID}`)
        .set('Cookie', faculty1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toContain('Harendra Pratap Singh');
    });

    it('denies faculty access to an unassigned student outside mentor/course/department scope (403 Forbidden)', async () => {
      // Dr. Rajesh Sharma (Faculty 1) is NOT mentor for Student 2 (Student 2's mentor is Dr. Vivek Bhatt)
      // and Faculty 1 is not assigned to Student 2's specific courses/dept scope for student 2
      const res = await request(app)
        .get(`/api/profile/students/${STUDENT2_PROFILE_ID}`)
        .set('Cookie', faculty1Cookie);

      // Must be 403 Forbidden because Dr. Rajesh does not have an authorized relationship with Student 2
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows Registrar Admin institutional access to any student profile', async () => {
      const res1 = await request(app)
        .get(`/api/profile/students/${STUDENT1_PROFILE_ID}`)
        .set('Cookie', adminCookie);
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .get(`/api/profile/students/${STUDENT2_PROFILE_ID}`)
        .set('Cookie', adminCookie);
      expect(res2.status).toBe(200);
    });
  });

  describe('4. Profile Updates, Protected Field Rejection & Audit Immutability', () => {
    it('allows student to update permitted contact/personal fields', async () => {
      const updatePayload = {
        phone: '+91 91234 56789',
        personalEmail: 'harendra.personal@gmail.com',
        emergencyContact: '+91 99887 76655',
        bloodGroup: 'O+',
        guardianName: 'Rajendra Pratap Singh',
        addressLine: 'Flat 402, Pine Grove Residency',
        city: 'Dehradun',
        state: 'Uttarakhand',
        pincode: '248007',
      };

      const res = await request(app)
        .patch('/api/profile/me')
        .set('Cookie', student1Cookie)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe('+91 91234 56789');
      expect(res.body.data.personalEmail).toBe('harendra.personal@gmail.com');
      expect(res.body.data.bloodGroup).toBe('O+');
      expect(res.body.data.city).toBe('Dehradun');
      expect(res.body.data.pincode).toBe('248007');
    });

    it('strictly rejects modifications to protected institutional fields (e.g. rollNumber, CGPA, role)', async () => {
      // Attempt 1: tampering with rollNumber and currentCgpa
      const res1 = await request(app)
        .patch('/api/profile/me')
        .set('Cookie', student1Cookie)
        .send({
          rollNumber: '0251BTCS999',
          currentCgpa: 10.0,
        });

      expect([403, 422]).toContain(res1.status);
      expect(res1.body.success).toBe(false);

      // Attempt 2: tampering with mentorFacultyId or semester
      const res2 = await request(app)
        .patch('/api/profile/me')
        .set('Cookie', student1Cookie)
        .send({
          currentSemester: 8,
          mentorFacultyId: 'a0000000-0000-4000-8000-000000000099',
        });

      expect([403, 422]).toContain(res2.status);
      expect(res2.body.success).toBe(false);
    });

    it('validates input formats and rejects invalid emails, phone numbers, or blood groups with 422', async () => {
      const res = await request(app)
        .patch('/api/profile/me')
        .set('Cookie', student1Cookie)
        .send({
          personalEmail: 'not-a-valid-email',
          bloodGroup: 'Z-', // invalid blood group
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('creates durable audit log records when student profile fields are modified', async () => {
      // Initial state
      const initialLogs = await request(app)
        .get('/api/profile/audit-trail')
        .set('Cookie', student1Cookie);
      const initialCount = initialLogs.body.data.length;

      // Update phone and personal email
      const updateRes = await request(app)
        .patch('/api/profile/me')
        .set('Cookie', student1Cookie)
        .send({
          phone: '+91 90000 11111',
          personalEmail: 'student.updated@gmail.com',
        });
      expect(updateRes.status).toBe(200);

      // Check audit trail
      const auditRes = await request(app)
        .get('/api/profile/audit-trail')
        .set('Cookie', student1Cookie);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.length).toBeGreaterThan(initialCount);
      const latestAudit = auditRes.body.data[0];
      expect(['PROFILE_UPDATE', 'PROFILE_CONTACT_UPDATED']).toContain(latestAudit.action);
      // Verify changedFields either contains string keys or record
      const fields = Array.isArray(latestAudit.changedFields)
        ? latestAudit.changedFields
        : Object.keys(latestAudit.changedFields || {});
      expect(fields.length).toBeGreaterThan(0);
      expect(latestAudit.newValues.phone).toBe('+91 90000 11111');
      expect(latestAudit.newValues.personalEmail).toBe('student.updated@gmail.com');
    });

    it('enforces database trigger immutability: UPDATE and DELETE on profile_audit_logs are blocked', async () => {
      // 1. Create an audit entry via update
      await request(app)
        .patch('/api/profile/me')
        .set('Cookie', student1Cookie)
        .send({ phone: '+91 92222 33333' });

      // Fetch the log id
      const logs = await prisma.profileAuditLog.findMany({
        where: { studentProfileId: STUDENT1_PROFILE_ID },
      });
      expect(logs.length).toBeGreaterThan(0);
      const testLogId = logs[0].id;

      // 2. Attempt UPDATE on profile_audit_logs -> must fail via trigger
      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE profile_audit_logs SET action = 'TAMPERED' WHERE id = '${testLogId}';`
        )
      ).rejects.toThrow();

      // 3. Attempt DELETE on profile_audit_logs -> must fail via trigger
      await expect(
        prisma.$executeRawUnsafe(
          `DELETE FROM profile_audit_logs WHERE id = '${testLogId}';`
        )
      ).rejects.toThrow();
    });
  });

  describe('5. Authoritative Academic Records & Privacy Controls', () => {
    it('returns authentic registered courses, credits, and standing for authenticated student', async () => {
      const res = await request(app)
        .get('/api/profile/academic-records')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.student.id).toBe(STUDENT1_PROFILE_ID);
      expect(data.currentCgpa).toBe(8.64);
      expect(data.totalEnrolledCredits).toBe(25);
      expect(data.academicStanding).toBe('FIRST CLASS WITH DISTINCTION');
      expect(Array.isArray(data.enrolledCourses)).toBe(true);
      expect(data.enrolledCourses.length).toBe(7);

      // Verify specific real course codes from seed data
      const courseCodes = data.enrolledCourses.map((c: any) => c.courseCode);
      expect(courseCodes).toContain('CS302');
      expect(courseCodes).toContain('CS304');
      expect(courseCodes).toContain('ENG301');

      // Verify instructor relationships are populated
      const dsCourse = data.enrolledCourses.find((c: any) => c.courseCode === 'CS302');
      expect(dsCourse).toBeDefined();
      expect(dsCourse.courseTitle).toContain('Algorithms');
      expect(dsCourse.primaryFaculty.fullName).toContain('Dr. Rajesh Sharma');
    });

    it('strictly prevents student from accessing another student academic records (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/profile/students/${STUDENT2_PROFILE_ID}/academic-records`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows assigned faculty mentor to inspect mentee academic records', async () => {
      const res = await request(app)
        .get(`/api/profile/students/${STUDENT1_PROFILE_ID}/academic-records`)
        .set('Cookie', faculty1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.id).toBe(STUDENT1_PROFILE_ID);
      expect(res.body.data.totalEnrolledCredits).toBe(25);
    });

    it('denies faculty inspection of unassigned student academic records (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/profile/students/${STUDENT2_PROFILE_ID}/academic-records`)
        .set('Cookie', faculty1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows Registrar Admin institutional access to student academic records', async () => {
      const res = await request(app)
        .get(`/api/profile/students/${STUDENT1_PROFILE_ID}/academic-records`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentCgpa).toBe(8.64);
    });
  });
});
