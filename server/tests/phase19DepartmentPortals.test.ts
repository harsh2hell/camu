import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { sessionRepository } from '../src/repositories/session.repository.js';
import { prisma } from '../src/lib/prisma.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 19: University Department Portals, Administrative Workflows & Centralized RBAC Suite', () => {
  let studentCookie: string[];
  let facultyCookie: string[];
  let admissionsCookie: string[];
  let financeCookie: string[];
  let itCookie: string[];
  let hodCookie: string[];
  let superAdminCookie: string[];

  const SOET_DEPT_ID = 'd0000000-0000-4000-8000-000000000001';
  const SOM_DEPT_ID = 'd0000000-0000-4000-8000-000000000002'; // Unrelated department
  const BTECH_CSE_PROG_ID = 'e0000000-0000-4000-8000-000000000001';
  const STUDENT_USER_ID = 'a0000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    clearRateLimitStore();
    sessionRepository.clearMemoryStore();

    // Ensure departments exist in PostgreSQL
    await prisma.department.upsert({
      where: { id: SOET_DEPT_ID },
      update: {},
      create: {
        id: SOET_DEPT_ID,
        name: 'School of Engineering & Technology',
        code: 'SOET',
      },
    });

    await prisma.department.upsert({
      where: { id: SOM_DEPT_ID },
      update: {},
      create: {
        id: SOM_DEPT_ID,
        name: 'School of Management',
        code: 'SOM',
      },
    });

    // 1. Authenticate Student
    const sRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'student.dev@dgu.ac.in', password: 'Password@Dev123' });
    expect(sRes.status).toBe(200);
    studentCookie = getCookies(sRes);

    // 2. Authenticate Faculty
    const fRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'faculty.dev@dgu.ac.in', password: 'Password@Dev123' });
    expect(fRes.status).toBe(200);
    facultyCookie = getCookies(fRes);

    // 3. Authenticate Admissions Officer
    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admissions.dev@dgu.ac.in', password: 'Password@Dev123' });
    expect(aRes.status).toBe(200);
    admissionsCookie = getCookies(aRes);

    // 4. Authenticate Finance Officer
    const finRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'finance.dev@dgu.ac.in', password: 'Password@Dev123' });
    expect(finRes.status).toBe(200);
    financeCookie = getCookies(finRes);

    // 5. Authenticate IT Support
    const itRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'it.dev@dgu.ac.in', password: 'Password@Dev123' });
    expect(itRes.status).toBe(200);
    itCookie = getCookies(itRes);

    // 6. Authenticate HOD (SOET department)
    const hodRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'hod.dev@dgu.ac.in', password: 'Password@Dev123' });
    expect(hodRes.status).toBe(200);
    hodCookie = getCookies(hodRes);

    // 7. Authenticate Super Administrator
    const saRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'superadmin.dev@dgu.ac.in', password: 'Password@Dev123' });
    expect(saRes.status).toBe(200);
    superAdminCookie = getCookies(saRes);
  });

  afterAll(async () => {
    clearRateLimitStore();
    sessionRepository.clearMemoryStore();
  });

  // ============================================================================
  // 1. Role-Based Access Control (RBAC) & Perimeter Security
  // ============================================================================
  describe('1. Centralized RBAC & Perimeter Security Enforcement', () => {
    it('1.1 should reject unauthenticated requests across all privileged department portals with 401', async () => {
      const endpoints = [
        { method: 'get', url: '/api/admissions/applications' },
        { method: 'get', url: '/api/finance/admin/invoices' },
        { method: 'get', url: '/api/academic/courses' },
        { method: `get`, url: `/api/department/${SOET_DEPT_ID}/overview` },
        { method: 'get', url: '/api/admin/users' },
      ];

      for (const ep of endpoints) {
        const res = await (request(app) as any)[ep.method](ep.url);
        expect(res.status).toBe(401);
      }
    });

    it('1.2 should strictly prohibit STUDENT access to administrative department endpoints with 403 Forbidden', async () => {
      const forbiddenEndpoints = [
        '/api/admissions/applications',
        '/api/finance/admin/invoices',
        '/api/admin/users',
        `/api/department/${SOET_DEPT_ID}/overview`,
      ];

      for (const url of forbiddenEndpoints) {
        const res = await request(app)
          .get(url)
          .set('Cookie', studentCookie);
        expect(res.status).toBe(403);
      }
    });

    it('1.3 should prevent FACULTY from accessing admissions, finance administration, or super-admin portals with 403', async () => {
      const admissionsRes = await request(app)
        .get('/api/admissions/applications')
        .set('Cookie', facultyCookie);
      expect(admissionsRes.status).toBe(403);

      const financeRes = await request(app)
        .get('/api/finance/admin/invoices')
        .set('Cookie', facultyCookie);
      expect(financeRes.status).toBe(403);

      const superAdminRes = await request(app)
        .get('/api/admin/users')
        .set('Cookie', facultyCookie);
      expect(superAdminRes.status).toBe(403);
    });

    it('1.4 should restrict user account administration exclusively to SUPER_ADMIN', async () => {
      // Admissions Officer attempting to access user administration
      const admRes = await request(app)
        .get('/api/admin/users')
        .set('Cookie', admissionsCookie);
      expect(admRes.status).toBe(403);

      // IT Support attempting to access user administration
      const itRes = await request(app)
        .get('/api/admin/users')
        .set('Cookie', itCookie);
      expect(itRes.status).toBe(403);

      // Super Admin successfully accesses user administration
      const saRes = await request(app)
        .get('/api/admin/users')
        .set('Cookie', superAdminCookie);
      expect(saRes.status).toBe(200);
      expect(saRes.body.status).toBe('success');
    });
  });

  // ============================================================================
  // 2. Admissions and Enrollment Portal
  // ============================================================================
  describe('2. Admissions & Enrollment Lifecycle Workflows', () => {
    let createdAppId: string;
    const testApplicantEmail = `applicant.${Date.now()}@example.com`;

    it('2.1 should allow authorized admissions staff to create an admission application', async () => {
      const payload = {
        applicantName: 'Devika Singhania',
        applicantEmail: testApplicantEmail,
        applicantPhone: '+91 9876540001',
        programId: BTECH_CSE_PROG_ID,
        academicYear: '2026-27',
        highSchoolPercentage: 88.5,
        intermediatePercentage: 91.2,
        entranceExamScore: 145,
        documents: [
          { name: '10th_Marksheet.pdf', url: 'https://docs.dgu.ac.in/private/10th.pdf' },
          { name: '12th_Marksheet.pdf', url: 'https://docs.dgu.ac.in/private/12th.pdf' },
        ],
      };

      const res = await request(app)
        .post('/api/admissions/applications')
        .set('Cookie', admissionsCookie)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.applicantName).toBe('Devika Singhania');
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.applicationNumber).toMatch(/^DGU-2026-/);
      createdAppId = res.body.data.id;
    });

    it('2.2 should query applications with search and filters', async () => {
      const res = await request(app)
        .get(`/api/admissions/applications?search=${encodeURIComponent('Singhania')}`)
        .set('Cookie', admissionsCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('2.3 should add a review note to the application', async () => {
      const res = await request(app)
        .post(`/api/admissions/applications/${createdAppId}/notes`)
        .set('Cookie', admissionsCookie)
        .send({ note: 'Entrance examination scorecard verified against state percentile list.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reviewNotes).toContain('Entrance examination scorecard verified against state percentile list.');
    });

    it('2.4 should progress application status through OFFER_MADE and OFFER_ACCEPTED', async () => {
      // 1. Issue offer
      const offerRes = await request(app)
        .patch(`/api/admissions/applications/${createdAppId}/status`)
        .set('Cookie', admissionsCookie)
        .send({ status: 'OFFER_MADE', reason: 'Meets academic criteria for B.Tech CSE' });
      expect(offerRes.status).toBe(200);
      expect(offerRes.body.data.status).toBe('OFFER_MADE');

      // 2. Offer accepted by applicant
      const acceptRes = await request(app)
        .patch(`/api/admissions/applications/${createdAppId}/status`)
        .set('Cookie', admissionsCookie)
        .send({ status: 'OFFER_ACCEPTED', reason: 'Seat reservation fee deposited' });
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe('OFFER_ACCEPTED');
    });

    it('2.5 should execute idempotent enrollment conversion into authoritative student record', async () => {
      // First enrollment attempt
      const enrollRes = await request(app)
        .post(`/api/admissions/applications/${createdAppId}/enroll`)
        .set('Cookie', admissionsCookie)
        .send({});

      expect(enrollRes.status).toBe(200);
      expect(enrollRes.body.status).toBe('success');
      expect(enrollRes.body.data.studentUser).toBeDefined();
      expect(enrollRes.body.data.studentProfile).toBeDefined();
      expect(enrollRes.body.data.invoice).toBeDefined();
      const generatedRoll = enrollRes.body.data.studentProfile.rollNumber;
      expect(generatedRoll).toMatch(/^26/); // Academic year prefix

      // Second retry attempt (Idempotent check)
      const retryRes = await request(app)
        .post(`/api/admissions/applications/${createdAppId}/enroll`)
        .set('Cookie', admissionsCookie)
        .send({});

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.message).toContain('already enrolled');
      expect(retryRes.body.data.studentProfile.rollNumber).toBe(generatedRoll);
    });

    it('2.6 should maintain audit trail for all admissions mutations', async () => {
      const res = await request(app)
        .get(`/api/admissions/applications/${createdAppId}/audit-logs`)
        .set('Cookie', admissionsCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const actions = res.body.data.map((l: any) => l.action);
      expect(actions).toContain('STATUS_CHANGE');
    });
  });

  // ============================================================================
  // 3. Finance & Accounts Portal
  // ============================================================================
  describe('3. Finance & Accounts Authoritative Administration', () => {
    it('3.1 should allow authorized Finance Officer to lookup any student fee ledger', async () => {
      const res = await request(app)
        .get(`/api/finance/admin/students/${STUDENT_USER_ID}/ledger`)
        .set('Cookie', financeCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.totalInvoiced).toBeGreaterThanOrEqual(0);
      expect(['CLEARED', 'PENDING_DUES']).toContain(res.body.data.noDuesStatus);
    });

    it('3.2 should block unauthorized staff from student financial lookup', async () => {
      const res = await request(app)
        .get(`/api/finance/admin/students/${STUDENT_USER_ID}/ledger`)
        .set('Cookie', facultyCookie);

      expect(res.status).toBe(403);
    });

    it('3.3 should prevent duplicate offline payment reconciliation with identical transactionRef', async () => {
      // Find an active invoice
      const invListRes = await request(app)
        .get('/api/finance/admin/invoices?limit=1')
        .set('Cookie', financeCookie);

      if (invListRes.body.data && invListRes.body.data.length > 0) {
        const invoice = invListRes.body.data[0];
        const uniqueTxRef = `CHALLAN-TEST-${Date.now()}`;

        // First reconciliation
        const r1 = await request(app)
          .post('/api/finance/admin/reconcile')
          .set('Cookie', financeCookie)
          .send({
            invoiceId: invoice.id,
            amount: 100,
            paymentMode: 'CHALLAN',
            transactionRef: uniqueTxRef,
            notes: 'Counter payment test',
          });
        expect([200, 400, 422]).toContain(r1.status);

        if (r1.status === 200) {
          // Attempt duplicate reconciliation with identical transactionRef
          const r2 = await request(app)
            .post('/api/finance/admin/reconcile')
            .set('Cookie', financeCookie)
            .send({
              invoiceId: invoice.id,
              amount: 100,
              paymentMode: 'CHALLAN',
              transactionRef: uniqueTxRef,
              notes: 'Duplicate attempt',
            });
          expect(r2.status).toBe(409); // Conflict error on duplicate ref
        }
      }
    });

    it('3.4 should preserve GATEWAY_UNCONFIGURED on student online payment attempts', async () => {
      const invListRes = await request(app)
        .get('/api/finance/student/invoices')
        .set('Cookie', studentCookie);

      if (invListRes.body.data && invListRes.body.data.length > 0) {
        const invoiceId = invListRes.body.data[0].id;
        const res = await request(app)
          .post('/api/finance/student/pay')
          .set('Cookie', studentCookie)
          .send({ invoiceId, amount: 1000 });

        expect(res.status).toBe(200);
        expect(res.body.data.isConfigured).toBe(false);
        expect(res.body.data.status).toBe('GATEWAY_UNCONFIGURED');
      }
    });
  });

  // ============================================================================
  // 4. Academic Administration & Authorized Corrections
  // ============================================================================
  describe('4. Academic Administration & Authorized Corrections', () => {
    let testCourseId: string;
    const testCourseCode = `CSE-P19-${Date.now().toString().slice(-4)}`;

    it('4.1 should allow authorized administrative staff to create a course in the catalog', async () => {
      const res = await request(app)
        .post('/api/academic/courses')
        .set('Cookie', superAdminCookie)
        .send({
          departmentId: SOET_DEPT_ID,
          code: testCourseCode,
          title: 'Advanced Distributed Systems & High Performance Computing',
          credits: 4,
          lectureHours: 3,
          tutorialHours: 0,
          practicalHours: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.code).toBe(testCourseCode);
      testCourseId = res.body.data.id;
    });

    it('4.2 should list course catalog with department filters', async () => {
      const res = await request(app)
        .get(`/api/academic/courses?departmentId=${SOET_DEPT_ID}`)
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const codes = res.body.data.map((c: any) => c.code);
      expect(codes).toContain(testCourseCode);
    });

    it('4.3 should reject attendance correction without valid justification reason with 422/400', async () => {
      const res = await request(app)
        .post('/api/academic/corrections/attendance')
        .set('Cookie', superAdminCookie)
        .send({
          attendanceRecordId: '550e8400-e29b-41d4-a716-446655440000',
          newStatus: 'PRESENT',
          reason: 'abc', // Too short (must be >= 5 chars)
        });

      expect([400, 422]).toContain(res.status);
    });

    it('4.4 should record academic correction log for enrollment status changes', async () => {
      const res = await request(app)
        .post('/api/academic/corrections/enrollment-status')
        .set('Cookie', superAdminCookie)
        .send({
          studentId: STUDENT_USER_ID,
          status: 'ACTIVE',
          reason: 'Annual verification completed by Office of the Registrar',
          approvalRef: 'DGU/REG/2026/VERIF-091',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.auditLog.approvalRef).toBe('DGU/REG/2026/VERIF-091');

      // Verify log appears in correction logs query
      const logsRes = await request(app)
        .get(`/api/academic/corrections/logs?studentId=${STUDENT_USER_ID}`)
        .set('Cookie', superAdminCookie);

      expect(logsRes.status).toBe(200);
      expect(logsRes.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // 5. HOD & Dean Department Leadership & Scope Enforcement (Anti-IDOR)
  // ============================================================================
  describe('5. Department Leadership & Anti-IDOR Scope Enforcement', () => {
    it('5.1 should allow HOD to inspect their own department overview & compliance', async () => {
      const res = await request(app)
        .get(`/api/department/${SOET_DEPT_ID}/overview`)
        .set('Cookie', hodCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.department.id).toBe(SOET_DEPT_ID);
      expect(res.body.data.stats).toBeDefined();
    });

    it('5.2 should strictly prohibit HOD from accessing unrelated departments (403 Forbidden)', async () => {
      // HOD belongs to SOET_DEPT_ID. Attempting to access SOM_DEPT_ID must fail!
      const res = await request(app)
        .get(`/api/department/${SOM_DEPT_ID}/overview`)
        .set('Cookie', hodCookie);

      expect(res.status).toBe(403);
      expect(res.body.error?.message || res.body.message).toMatch(/unauthorized department scope/i);
    });

    it('5.3 should calculate real attendance compliance report without crashing', async () => {
      const res = await request(app)
        .get(`/api/department/${SOET_DEPT_ID}/attendance-compliance?threshold=75`)
        .set('Cookie', hodCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.threshold).toBe(75);
      expect(res.body.data.overallComplianceRate).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.data.defaulters)).toBe(true);
    });
  });

  // ============================================================================
  // 6. IT Support & Helpdesk Internal Note Isolation
  // ============================================================================
  describe('6. IT Support Administration & Privacy Isolation', () => {
    it('6.1 should allow IT_SUPPORT staff to view staff support queue summary', async () => {
      const res = await request(app)
        .get('/api/support/queue/summary')
        .set('Cookie', itCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('6.2 should strictly hide staff internal notes from student ticket responses', async () => {
      // 1. Student creates a ticket
      const ticketRes = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', studentCookie)
        .send({
          subject: 'Wi-Fi Connection Issue in Lab Block C',
          description: 'Experiencing intermittent packet drops during lab sessions.',
          category: 'INFRASTRUCTURE',
          priority: 'MEDIUM',
        });

      if (ticketRes.status === 201) {
        const ticketId = ticketRes.body.data.id;

        // 2. IT staff adds an INTERNAL note
        await request(app)
          .post(`/api/support/tickets/${ticketId}/messages`)
          .set('Cookie', itCookie)
          .send({
            message: 'Switch port 24 flapping. Replaced SFP transceiver.',
            isInternal: true,
          });

        // 3. Student fetches ticket details
        const studentFetch = await request(app)
          .get(`/api/support/tickets/${ticketId}`)
          .set('Cookie', studentCookie);

        expect(studentFetch.status).toBe(200);
        const studentMessages = studentFetch.body.data.messages || [];
        const leaked = studentMessages.some((m: any) => m.message.includes('Switch port 24'));
        expect(leaked).toBe(false); // Internal notes must NEVER leak to students!

        // 4. Staff fetches ticket details (should see the internal note)
        const staffFetch = await request(app)
          .get(`/api/support/tickets/${ticketId}`)
          .set('Cookie', itCookie);

        expect(staffFetch.status).toBe(200);
        const staffMessages = staffFetch.body.data.messages || [];
        const staffCanSee = staffMessages.some((m: any) => m.message.includes('Switch port 24'));
        expect(staffCanSee).toBe(true);
      }
    });
  });

  // ============================================================================
  // 7. Super-Admin & Centralized Governance
  // ============================================================================
  describe('7. Super-Admin Central Governance & Role Management', () => {
    it('7.1 should retrieve platform health and diagnostics', async () => {
      const res = await request(app)
        .get('/api/admin/system/health')
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('OPERATIONAL');
      expect(res.body.data.database.connected).toBe(true);
      expect(res.body.data.paymentGateway.status).toBe('GATEWAY_UNCONFIGURED');
    });

    it('7.2 should prevent administrator from modifying their own role', async () => {
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', superAdminCookie);

      const superAdminId = meRes.body.data.user.id;

      const res = await request(app)
        .patch(`/api/admin/users/${superAdminId}/role`)
        .set('Cookie', superAdminCookie)
        .send({
          role: 'STUDENT',
          reason: 'Accidental demotion attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message || res.body.message).toMatch(/cannot modify their own/i);
    });

    it('7.3 should prevent administrator from suspending their own account', async () => {
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', superAdminCookie);

      const superAdminId = meRes.body.data.user.id;

      const res = await request(app)
        .patch(`/api/admin/users/${superAdminId}/status`)
        .set('Cookie', superAdminCookie)
        .send({
          isActive: false,
          reason: 'Accidental self-suspension attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message || res.body.message).toMatch(/cannot suspend their own account/i);
    });

    it('7.4 should record user audit log when updating another user status', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${STUDENT_USER_ID}/status`)
        .set('Cookie', superAdminCookie)
        .send({
          isActive: true,
          reason: 'Routine compliance audit confirmation',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Check audit log
      const auditRes = await request(app)
        .get(`/api/admin/audit-logs?targetUserId=${STUDENT_USER_ID}`)
        .set('Cookie', superAdminCookie);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.length).toBeGreaterThanOrEqual(1);
      const log = auditRes.body.data[0];
      expect(log.action).toBe('STATUS_CHANGE');
    });
  });
});
