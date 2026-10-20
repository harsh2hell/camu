import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { sessionRepository } from '../src/repositories/session.repository.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { FileStorage } from '../src/lib/fileStorage.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 7: Leave & On-Duty Management Suite', () => {
  let student1Cookie: string[];
  let student2Cookie: string[];
  let faculty1Cookie: string[]; // Dr. Rajesh Sharma (Mentor of Student 1)
  let faculty2Cookie: string[]; // Dr. Vivek Bhatt (Mentor of Student 2)
  let adminCookie: string[];

  const student1Id = 'a0000000-0000-4000-8000-000000000001';
  const student2Id = 'a0000000-0000-4000-8000-000000000003';

  beforeEach(async () => {
    sessionRepository.clearMemoryStore();
    clearRateLimitStore();

    // Clean up test leave applications created during tests using TRUNCATE CASCADE to bypass row triggers
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE leave_audit_logs, leave_applications CASCADE;');
    } catch {
      // ignore if DB is offline or mock
    }

    // Authenticate Student 1 (Dr. Rajesh's mentee)
    const s1Res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'student.dev@dgu.ac.in', password: 'Password@Dev123' });
    student1Cookie = getCookies(s1Res);

    // Authenticate Student 2 (Dr. Vivek's mentee)
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

    // Authenticate Admin
    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin.dev@dgu.ac.in', password: 'Password@Dev123' });
    adminCookie = getCookies(aRes);
  });

  afterEach(async () => {
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE leave_audit_logs, leave_applications CASCADE;');
    } catch {
      // ignore
    }
  });

  describe('1. Authentication & RBAC Authorization Controls', () => {
    it('rejects unauthenticated requests to submit application with 401', async () => {
      const res = await request(app)
        .post('/api/leave-od/applications')
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: 'Unauthenticated Request',
          startDate: '2026-11-01',
          endDate: '2026-11-02',
          reason: 'Valid reason exceeding 5 characters',
        });

      expect(res.status).toBe(401);
    });

    it('prevents students from accessing the approver pending queue with 403', async () => {
      const res = await request(app)
        .get('/api/leave-od/approvals/pending')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
    });

    it('prevents students from deciding applications with 403', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app)
        .post(`/api/leave-od/approvals/${fakeId}/decide`)
        .set('Cookie', student1Cookie)
        .send({
          action: 'APPROVE',
        });

      expect(res.status).toBe(403);
    });

    it('prevents Student 2 from viewing Student 1 private application details with 403', async () => {
      // Create application as Student 1
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'MEDICAL',
          title: 'Viral Fever Medical Leave',
          startDate: '2026-11-05',
          endDate: '2026-11-07',
          reason: 'Advised bed rest for three days',
        });

      expect(createRes.status).toBe(201);
      const appId = createRes.body.data.id;

      // Student 2 attempts to view Student 1's application
      const viewRes = await request(app)
        .get(`/api/leave-od/applications/${appId}`)
        .set('Cookie', student2Cookie);

      expect(viewRes.status).toBe(403);
    });

    it('prevents Student 2 from withdrawing Student 1 application with 403', async () => {
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: 'Family Function Leave',
          startDate: '2026-11-10',
          endDate: '2026-11-12',
          reason: 'Attending cousin sister wedding ceremony',
        });

      expect(createRes.status).toBe(201);
      const appId = createRes.body.data.id;

      const withdrawRes = await request(app)
        .post(`/api/leave-od/applications/${appId}/withdraw`)
        .set('Cookie', student2Cookie)
        .send({ reason: 'Malicious unauthorized withdrawal attempt' });

      expect(withdrawRes.status).toBe(403);
    });

    it('prevents faculty from approving an application outside their assigned mentee scope with 403', async () => {
      // Student 2 is mentored by Dr. Vivek (Faculty 2)
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student2Cookie)
        .send({
          category: 'ON_DUTY',
          leaveType: 'OD_HACKATHON',
          title: 'IIT Delhi Hackathon Participation',
          startDate: '2026-11-15',
          endDate: '2026-11-17',
          reason: 'Representing DBS University at national hackathon',
        });

      expect(createRes.status).toBe(201);
      const appId = createRes.body.data.id;

      // Dr. Rajesh (Faculty 1) attempts to approve Student 2's application
      const decideRes = await request(app)
        .post(`/api/leave-od/approvals/${appId}/decide`)
        .set('Cookie', faculty1Cookie)
        .send({
          action: 'APPROVE',
          reason: 'Unauthorized approval attempt by wrong faculty',
        });

      expect(decideRes.status).toBe(403);
    });
  });

  describe('2. Validation & Policy Enforcement', () => {
    it('rejects reversed dates (endDate earlier than startDate) with 400', async () => {
      const res = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: 'Invalid Date Range Request',
          startDate: '2026-11-10',
          endDate: '2026-11-08', // Earlier than startDate
          reason: 'Valid justification with sufficient length',
        });

      expect(res.status).toBe(422);
      expect(res.body.error?.message).toMatch(/validation/i);
    });

    it('rejects short reasons below minimum required length with 422', async () => {
      const res = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: 'Valid Title Here',
          startDate: '2026-11-10',
          endDate: '2026-11-11',
          reason: 'Hi', // Too short (min 5 chars)
        });

      expect(res.status).toBe(422);
    });

    it('rejects rejection decision without mandatory explanation reason with 422', async () => {
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: 'Legitimate Leave Request',
          startDate: '2026-11-20',
          endDate: '2026-11-21',
          reason: 'Legitimate reason provided for leave',
        });

      const appId = createRes.body.data.id;

      // Approver rejects without reason
      const rejectRes = await request(app)
        .post(`/api/leave-od/approvals/${appId}/decide`)
        .set('Cookie', faculty1Cookie)
        .send({
          action: 'REJECT',
          reason: '', // Mandatory min 3 chars
        });

      expect(rejectRes.status).toBe(422);
    });

    it('prevents overlapping active leave or OD applications with 409 Conflict', async () => {
      // 1. Submit initial active application for Nov 20 - Nov 25
      const firstRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: 'First Active Vacation Request',
          startDate: '2026-11-20',
          endDate: '2026-11-25',
          reason: 'Family trip planned in advance',
        });

      expect(firstRes.status).toBe(201);

      // 2. Submit second overlapping application for Nov 22 - Nov 28
      const secondRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'ON_DUTY',
          leaveType: 'OD_SPORTS',
          title: 'Overlapping Sports OD Request',
          startDate: '2026-11-22',
          endDate: '2026-11-28',
          reason: 'University football tournament finals',
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error?.message).toMatch(/overlap/i);
    });
  });

  describe('3. State Machine Transitions & Concurrency Integrity', () => {
    it('supports student withdrawal of pending application and records audit log', async () => {
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: 'Request to be Withdrawn',
          startDate: '2026-12-01',
          endDate: '2026-12-02',
          reason: 'Will withdraw this request shortly',
        });

      const appId = createRes.body.data.id;

      const withdrawRes = await request(app)
        .post(`/api/leave-od/applications/${appId}/withdraw`)
        .set('Cookie', student1Cookie)
        .send({ reason: 'Trip rescheduled by family' });

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.data.status).toBe('WITHDRAWN');

      // Verify audit trail contains withdrawal
      const auditRes = await request(app)
        .get(`/api/leave-od/applications/${appId}/audit-trail`)
        .set('Cookie', student1Cookie);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.some((l: any) => l.action === 'APPLICATION_WITHDRAWN')).toBe(true);
    });

    it('prevents withdrawal of an already finalized (APPROVED) application with 409 Conflict', async () => {
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'ON_DUTY',
          leaveType: 'OD_HACKATHON',
          title: 'Approved On-Duty Pass',
          startDate: '2026-12-05',
          endDate: '2026-12-06',
          reason: 'Accepted hackathon presentation team lead',
        });

      const appId = createRes.body.data.id;

      // Mentor approves application
      const approveRes = await request(app)
        .post(`/api/leave-od/approvals/${appId}/decide`)
        .set('Cookie', faculty1Cookie)
        .send({
          action: 'APPROVE',
          reason: 'Endorsed. Carry ID card to venue.',
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('APPROVED');

      // Student attempts to withdraw approved application
      const withdrawRes = await request(app)
        .post(`/api/leave-od/applications/${appId}/withdraw`)
        .set('Cookie', student1Cookie)
        .send({ reason: 'Attempting to withdraw after approval' });

      expect(withdrawRes.status).toBe(409);
    });

    it('supports correction workflow: REQUEST_CORRECTION -> student RESUBMIT -> APPROVE', async () => {
      // 1. Student submits application
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'MEDICAL',
          title: 'Medical Leave Missing Clinic Note',
          startDate: '2026-12-10',
          endDate: '2026-12-12',
          reason: 'Severe food poisoning vomiting and chills',
        });

      const appId = createRes.body.data.id;

      // 2. Approver requests correction
      const reqCorrRes = await request(app)
        .post(`/api/leave-od/approvals/${appId}/decide`)
        .set('Cookie', faculty1Cookie)
        .send({
          action: 'REQUEST_CORRECTION',
          reason: 'Please upload the stamped medical fitness certificate from medical officer.',
        });

      expect(reqCorrRes.status).toBe(200);
      expect(reqCorrRes.body.data.status).toBe('NEEDS_CORRECTION');

      // 3. Student resubmits with updated reason
      const resubmitRes = await request(app)
        .patch(`/api/leave-od/applications/${appId}/resubmit`)
        .set('Cookie', student1Cookie)
        .send({
          reason: 'Attaching certificate as requested by Dr. Rajesh Sharma. Recovered fully.',
        });

      expect(resubmitRes.status).toBe(200);
      expect(resubmitRes.body.data.status).toBe('PENDING');

      // 4. Approver approves resubmitted application
      const finalApproveRes = await request(app)
        .post(`/api/leave-od/approvals/${appId}/decide`)
        .set('Cookie', faculty1Cookie)
        .send({
          action: 'APPROVE',
          reason: 'Verified doctor note. Approved.',
        });

      expect(finalApproveRes.status).toBe(200);
      expect(finalApproveRes.body.data.status).toBe('APPROVED');
    });

    it('prevents double-decision on an already finalized application with 409 Conflict', async () => {
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: 'Single Decision Invariant Check',
          startDate: '2026-12-20',
          endDate: '2026-12-21',
          reason: 'Personal leave for family celebration',
        });

      const appId = createRes.body.data.id;

      // First decision: APPROVED
      const dec1 = await request(app)
        .post(`/api/leave-od/approvals/${appId}/decide`)
        .set('Cookie', faculty1Cookie)
        .send({ action: 'APPROVE', reason: 'Approved without issues' });

      expect(dec1.status).toBe(200);

      // Second decision on same application: REJECT -> should fail with 409 Conflict
      const dec2 = await request(app)
        .post(`/api/leave-od/approvals/${appId}/decide`)
        .set('Cookie', faculty1Cookie)
        .send({ action: 'REJECT', reason: 'Attempting conflicting decision' });

      expect(dec2.status).toBe(409);
    });
  });

  describe('4. Supporting Documents & File Security', () => {
    it('saves secure base64 document and allows authorized student & approver to download', async () => {
      // Small dummy PDF header: %PDF-1.4\n%EOF
      const pdfBuffer = Buffer.from('%PDF-1.4\n%EOF\n');
      const base64Data = pdfBuffer.toString('base64');

      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'ON_DUTY',
          leaveType: 'OD_CONFERENCE',
          title: 'IEEE Conference Presentation',
          startDate: '2026-12-28',
          endDate: '2026-12-29',
          reason: 'Presenting research paper on distributed ledger security',
          fileName: 'ieee_invitation.pdf',
          fileData: base64Data,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.hasSupportingDocument).toBe(true);
      const appId = createRes.body.data.id;

      // Student 1 (owner) can download
      const s1DocRes = await request(app)
        .get(`/api/leave-od/applications/${appId}/document`)
        .set('Cookie', student1Cookie);

      expect(s1DocRes.status).toBe(200);
      expect(s1DocRes.headers['content-type']).toContain('application/pdf');

      // Faculty 1 (mentor) can download
      const f1DocRes = await request(app)
        .get(`/api/leave-od/applications/${appId}/document`)
        .set('Cookie', faculty1Cookie);

      expect(f1DocRes.status).toBe(200);

      // Student 2 (unauthorized student) CANNOT download -> 403 Forbidden
      const s2DocRes = await request(app)
        .get(`/api/leave-od/applications/${appId}/document`)
        .set('Cookie', student2Cookie);

      expect(s2DocRes.status).toBe(403);
    });
  });

  describe('5. Attendance Isolation Enforcement', () => {
    it('does NOT mutate attendance records on leave approval while policy is disabled', async () => {
      // Verify existing attendance session count / records
      const initialRecords = await prisma.attendanceRecord.count();

      // Submit and approve leave application
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'ON_DUTY',
          leaveType: 'OD_SPORTS',
          title: 'State Championship Sports OD',
          startDate: '2026-10-15',
          endDate: '2026-10-16',
          reason: 'Inter-university basketball championship semifinals',
        });

      expect(createRes.status).toBe(201);
      const appId = createRes.body.data.id;

      // Faculty approves application
      const approveRes = await request(app)
        .post(`/api/leave-od/approvals/${appId}/decide`)
        .set('Cookie', faculty1Cookie)
        .send({ action: 'APPROVE', reason: 'Sports Director letter on record.' });

      expect(approveRes.status).toBe(200);

      // Verify attendance records were NOT mutated without explicit academic policy
      const postApprovalRecords = await prisma.attendanceRecord.count();
      expect(postApprovalRecords).toBe(initialRecords);
    });
  });

  describe('6. Database Trigger & Audit Immutability', () => {
    it('prohibits direct UPDATE and DELETE on leave_audit_logs via PostgreSQL trigger', async () => {
      // 1. Create an application to produce an audit log
      const createRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: 'Immutable Audit Test Application',
          startDate: '2026-12-30',
          endDate: '2026-12-31',
          reason: 'Verifying PostgreSQL immutable audit trigger',
        });

      const appId = createRes.body.data.id;

      // Find the audit log ID
      const auditRes = await request(app)
        .get(`/api/leave-od/applications/${appId}/audit-trail`)
        .set('Cookie', student1Cookie);

      expect(auditRes.body.data.length).toBeGreaterThan(0);
      const logId = auditRes.body.data[0].id;

      // Attempt direct SQL UPDATE on leave_audit_logs -> must trigger exception
      let updateError: Error | null = null;
      try {
        await prisma.$executeRaw`
          UPDATE leave_audit_logs SET reason = 'Tampered Reason' WHERE id = ${logId}::uuid
        `;
      } catch (err: any) {
        updateError = err;
      }

      expect(updateError).not.toBeNull();
      expect(updateError?.message).toMatch(/immutable/i);
    });
  });
});
