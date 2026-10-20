import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 18: Complete Student Portal API Integration & RBAC Verification Suite', () => {
  let studentCookie: string[];
  let facultyCookie: string[];
  let studentUserId: string;

  beforeAll(async () => {
    clearRateLimitStore();

    // 1. Authenticate as student
    const studentRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    expect(studentRes.status).toBe(200);
    expect(studentRes.body.success).toBe(true);
    expect(studentRes.body.data.user.role).toBe('STUDENT');
    studentUserId = studentRes.body.data.user.id;
    studentCookie = getCookies(studentRes);

    // 2. Authenticate as faculty
    const facultyRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'faculty.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    expect(facultyRes.status).toBe(200);
    expect(facultyRes.body.success).toBe(true);
    expect(facultyRes.body.data.user.role).toBe('FACULTY');
    facultyCookie = getCookies(facultyRes);
  });

  afterAll(async () => {
    clearRateLimitStore();
  });

  // ============================================================================
  // 1. Session & Identity Verification
  // ============================================================================
  describe('1. Session & Identity Verification', () => {
    it('1.1 should return student identity via GET /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(studentUserId);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user.email).toBe('student.dev@dgu.ac.in');
    });

    it('1.2 should retrieve full student profile via GET /api/profile/me', async () => {
      const res = await request(app)
        .get('/api/profile/me')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBeDefined();
      expect(res.body.data.rollNumber).toBe('0251BTCS097');
      expect(res.body.data.department.name).toBe('School of Engineering & Technology');
    });

    it('1.3 should reject modification to protected institutional fields (rollNumber, CGPA)', async () => {
      const res = await request(app)
        .patch('/api/profile/me')
        .set('Cookie', studentCookie)
        .send({
          rollNumber: 'HACKED999',
          cgpa: 10.0,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('1.4 should retrieve dynamic academic records via GET /api/profile/academic-records', async () => {
      const res = await request(app)
        .get('/api/profile/academic-records')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.enrolledCourses).toBeInstanceOf(Array);
      expect(res.body.data.currentCgpa).toBeGreaterThan(0);
      expect(res.body.data.totalEnrolledCredits).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 2. Attendance & Schedule Workflows
  // ============================================================================
  describe('2. Attendance & Schedule Workflows', () => {
    it('2.1 should retrieve student attendance summary via GET /api/attendance/my-summary', async () => {
      const res = await request(app)
        .get('/api/attendance/my-summary')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overallPercentage).toBeDefined();
      expect(res.body.data.subjects).toBeInstanceOf(Array);
    });

    it('2.2 should retrieve student timetable via GET /api/timetable/student', async () => {
      const res = await request(app)
        .get('/api/timetable/student')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.schedule).toBeDefined();
    });

    it('2.3 should enforce RBAC: student cannot create attendance sessions (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/attendance/sessions')
        .set('Cookie', studentCookie)
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          sessionDate: new Date().toISOString(),
          startTime: '10:00 AM',
        });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // 3. LMS & Assignment Workflows
  // ============================================================================
  describe('3. LMS & Assignment Integration', () => {
    it('3.1 should retrieve student assignments via GET /api/assignments/student', async () => {
      const res = await request(app)
        .get('/api/assignments/student')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('3.2 should enforce RBAC: student cannot access faculty assignment creation', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', studentCookie)
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          title: 'Unauthorized Student Assignment',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          maxMarks: 100,
        });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // 4. Leave & OD Lifecycle
  // ============================================================================
  describe('4. Leave & OD Management', () => {
    it('4.1 should retrieve leave applications via GET /api/leave-od/applications', async () => {
      const res = await request(app)
        .get('/api/leave-od/applications')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('4.2 should allow student to submit leave application via POST /api/leave-od/applications', async () => {
      // Use unique future dates to prevent 409 conflict
      const uniqueDays = Math.floor(Math.random() * 500) + 100;
      const startDate = new Date(Date.now() + uniqueDays * 86400000).toISOString().split('T')[0];
      const endDate = new Date(Date.now() + (uniqueDays + 1) * 86400000).toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', studentCookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: `Phase 18 Integration Leave ${Date.now()}`,
          startDate,
          endDate,
          reason: 'Verifying automated leave creation via Phase 18 suite.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('PENDING');
    });
  });

  // ============================================================================
  // 5. Notices & Institutional Announcements
  // ============================================================================
  describe('5. Notices & Announcements', () => {
    it('5.1 should fetch active notices via GET /api/notices', async () => {
      const res = await request(app)
        .get('/api/notices')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('5.2 should reject notice creation by students with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/notices')
        .set('Cookie', studentCookie)
        .send({
          title: 'Fake Student Notice',
          content: 'This should not be allowed.',
          targetAudience: 'ALL',
        });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // 6. Helpdesk & Support Tickets
  // ============================================================================
  describe('6. Helpdesk Support System', () => {
    let createdTicketId: string;

    it('6.1 should allow student to create support ticket via POST /api/support/tickets', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', studentCookie)
        .send({
          category: 'ACADEMIC',
          subject: 'Phase 18 Integration Query: Course Registration Verification',
          description: 'Verifying automated helpdesk ticket creation and student thread integration.',
          priority: 'MEDIUM',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketNumber).toBeDefined();
      createdTicketId = res.body.data.id;
    });

    it('6.2 should retrieve ticket details and student messages via GET /api/support/tickets/:id', async () => {
      const res = await request(app)
        .get(`/api/support/tickets/${createdTicketId}`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdTicketId);
      expect(res.body.data.messages).toBeInstanceOf(Array);
    });

    it('6.3 should allow student to append reply message via POST /api/support/tickets/:id/messages', async () => {
      const res = await request(app)
        .post(`/api/support/tickets/${createdTicketId}/messages`)
        .set('Cookie', studentCookie)
        .send({
          message: 'Student follow-up response in ticket discussion thread.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Student follow-up response in ticket discussion thread.');
    });
  });

  // ============================================================================
  // 7. Finance & Fee Receipts (Honest Gateway Behavior)
  // ============================================================================
  describe('7. Fee Ledger & Honest Payment Processing', () => {
    it('7.1 should retrieve student fee ledger via GET /api/finance/student/ledger', async () => {
      const res = await request(app)
        .get('/api/finance/student/ledger')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(typeof res.body.data.totalInvoiced).toBe('number');
      expect(typeof res.body.data.totalPaid).toBe('number');
      expect(typeof res.body.data.totalOutstanding).toBe('number');
      expect(res.body.data.invoices).toBeInstanceOf(Array);
      expect(res.body.data.noDuesStatus).toBeDefined();
    });

    it('7.2 should honestly report GATEWAY_UNCONFIGURED on POST /api/finance/student/pay without fake success', async () => {
      // First get an invoice to pay
      const ledgerRes = await request(app)
        .get('/api/finance/student/ledger')
        .set('Cookie', studentCookie);

      const invoiceId = ledgerRes.body.data.invoices[0]?.id;

      if (invoiceId) {
        const res = await request(app)
          .post('/api/finance/student/pay')
          .set('Cookie', studentCookie)
          .send({
            invoiceId,
            amount: 5000,
          });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.status).toBe('GATEWAY_UNCONFIGURED');
        expect(res.body.data.reconciliationInstructions).toBeDefined();
        expect(res.body.data.transactionRef).toBeDefined();
      }
    });
  });
});
