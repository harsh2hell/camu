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

describe('Phase 10: Student Support & Helpdesk Suite', () => {
  let student1Cookie: string[];
  let student2Cookie: string[];
  let faculty1Cookie: string[];
  let faculty2Cookie: string[];
  let adminCookie: string[];

  const STUDENT1_USER_ID = 'a0000000-0000-4000-8000-000000000001';
  const STUDENT2_USER_ID = 'a0000000-0000-4000-8000-000000000003';
  const FACULTY1_USER_ID = 'a0000000-0000-4000-8000-000000000002'; // Dr. Rajesh Sharma (Mentor of Student 1)
  const FACULTY2_USER_ID = 'a0000000-0000-4000-8000-000000000011'; // Dr. Vivek Bhatt (Mentor of Student 2)
  const ADMIN_USER_ID = 'a0000000-0000-4000-8000-000000000099';

  beforeEach(async () => {
    sessionRepository.clearMemoryStore();
    clearRateLimitStore();

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
    // Clean up created tickets and messages for test isolation
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE ticket_audit_logs CASCADE;');
      await prisma.$executeRawUnsafe('TRUNCATE TABLE ticket_messages CASCADE;');
      await prisma.$executeRawUnsafe('TRUNCATE TABLE support_tickets CASCADE;');
    } catch {
      // ignore
    }
  });

  describe('1. Authentication & Session Validation', () => {
    it('rejects unauthenticated requests to GET /api/support/my-tickets with 401', async () => {
      const res = await request(app).get('/api/support/my-tickets');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated requests to POST /api/support/tickets with 401', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .send({
          subject: 'Need help with course registration',
          description: 'Unable to select elective module in portal.',
          category: 'ACADEMIC',
        });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to GET /api/support/queue with 401', async () => {
      const res = await request(app).get('/api/support/queue');
      expect(res.status).toBe(401);
    });

    it('rejects student attempting to access staff queue with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/support/queue')
        .set('Cookie', student1Cookie);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Student Ticket Creation & Identity Isolation', () => {
    it('creates a support ticket with generated reference TKT-2026-XXXXX and initial audit log', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          subject: 'Fee receipt not displaying payment reference',
          description: 'Completed netbanking transaction but receipt shows status pending in portal.',
          category: 'FEES_FINANCE',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketNumber).toMatch(/^TKT-2026-\d{5}$/);
      expect(res.body.data.status).toBe('OPEN');
      expect(res.body.data.studentId).toBe(STUDENT1_USER_ID);
      expect(res.body.data.subject).toBe('Fee receipt not displaying payment reference');

      // Verify audit log created in database
      const audits = await prisma.ticketAuditLog.findMany({
        where: { ticketId: res.body.data.id },
      });
      expect(audits.length).toBeGreaterThanOrEqual(1);
      expect(audits[0].action).toBe('TICKET_CREATED');
      expect(audits[0].performedById).toBe(STUDENT1_USER_ID);
      expect(audits[0].newStatus).toBe('OPEN');
    });

    it('rejects ticket creation with invalid input (short subject/description, invalid category)', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          subject: 'help',
          description: 'short',
          category: 'INVALID_CATEGORY',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('derives student identity strictly from session, ignoring client-injected studentId', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          studentId: STUDENT2_USER_ID, // Malicious injection attempt
          subject: 'Attempting to forge ticket as another student',
          description: 'This ticket payload has an injected foreign student identifier.',
          category: 'GENERAL_INQUIRY',
        });

      expect(res.status).toBe(201);
      // Must belong to authenticated Student 1, NOT Student 2
      expect(res.body.data.studentId).toBe(STUDENT1_USER_ID);
      expect(res.body.data.studentId).not.toBe(STUDENT2_USER_ID);
    });
  });

  describe('3. Student Ticket Listing & Anti-IDOR Authorization', () => {
    let student1TicketId: string;
    let student2TicketId: string;

    beforeEach(async () => {
      // Create ticket for Student 1
      const res1 = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          subject: 'Hostel room allocation issue',
          description: 'Allocated bed number conflicts with roommate assignment in block B.',
          category: 'HOSTEL_CAMPUS',
        });
      student1TicketId = res1.body.data.id;

      // Create ticket for Student 2
      const res2 = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student2Cookie)
        .send({
          subject: 'Library card activation pending',
          description: 'RFID scan fails at entrance gate reader.',
          category: 'GENERAL_INQUIRY',
        });
      student2TicketId = res2.body.data.id;
    });

    it('allows Student 1 to view only their own tickets via GET /api/support/my-tickets', async () => {
      const res = await request(app)
        .get('/api/support/my-tickets')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(student1TicketId);
    });

    it('blocks Student 2 from accessing Student 1 ticket details via IDOR attempt (403)', async () => {
      const res = await request(app)
        .get(`/api/support/tickets/${student1TicketId}`)
        .set('Cookie', student2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('blocks Student 2 from sending replies to Student 1 ticket (403)', async () => {
      const res = await request(app)
        .post(`/api/support/tickets/${student1TicketId}/messages`)
        .set('Cookie', student2Cookie)
        .send({
          message: 'Unauthorized student injected reply attempt.',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Staff Scoped Queues & Department/Mentor Isolation', () => {
    let student1TicketId: string;
    let student2TicketId: string;

    beforeEach(async () => {
      // Student 1 (Mentee of Dr. Rajesh Sharma - Faculty 1)
      const res1 = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          subject: 'Course curriculum query',
          description: 'Requesting syllabus clarification for Advanced Database Systems.',
          category: 'ACADEMIC',
        });
      student1TicketId = res1.body.data.id;

      // Student 2 (Mentee of Dr. Vivek Bhatt - Faculty 2)
      const res2 = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student2Cookie)
        .send({
          subject: 'Special examination form submission',
          description: 'Medical certificate attached for examination makeup request.',
          category: 'EXAMINATIONS',
        });
      student2TicketId = res2.body.data.id;
    });

    it('allows Faculty 1 (Dr. Rajesh) to view mentee Student 1 ticket details', async () => {
      const res = await request(app)
        .get(`/api/support/tickets/${student1TicketId}`)
        .set('Cookie', faculty1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(student1TicketId);
    });

    it('blocks Faculty 2 (Dr. Vivek) from viewing Student 1 ticket when not mentor or assigned (403)', async () => {
      const res = await request(app)
        .get(`/api/support/tickets/${student1TicketId}`)
        .set('Cookie', faculty2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows Admin to view global queue and any student ticket', async () => {
      const resQueue = await request(app)
        .get('/api/support/queue')
        .set('Cookie', adminCookie);

      expect(resQueue.status).toBe(200);
      expect(resQueue.body.data.length).toBe(2);

      const resTicket = await request(app)
        .get(`/api/support/tickets/${student1TicketId}`)
        .set('Cookie', adminCookie);

      expect(resTicket.status).toBe(200);
      expect(resTicket.body.data.id).toBe(student1TicketId);
    });

    it('returns authoritative queue summary counters', async () => {
      const res = await request(app)
        .get('/api/support/queue/summary')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.totalOpen).toBe(2);
      expect(res.body.data.totalInProgress).toBe(0);
    });
  });

  describe('5. Internal Notes Shielding & Message Privacy', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          subject: 'Attendance discrepancy in Operating Systems',
          description: 'Marked absent on October 14 despite attending lab session.',
          category: 'ATTENDANCE',
        });
      ticketId = res.body.data.id;
    });

    it('allows staff to post an internal note that is visible to staff but hidden from student', async () => {
      // 1. Staff posts internal note
      const internalRes = await request(app)
        .post(`/api/support/tickets/${ticketId}/messages`)
        .set('Cookie', faculty1Cookie)
        .send({
          message: 'Internal Note: Checked biometric logs, student badge tapped at 10:05 AM. Need to confirm with lab instructor.',
          isInternal: true,
        });

      expect(internalRes.status).toBe(201);
      expect(internalRes.body.data.isInternal).toBe(true);

      // 2. Staff also posts a public message
      const publicRes = await request(app)
        .post(`/api/support/tickets/${ticketId}/messages`)
        .set('Cookie', faculty1Cookie)
        .send({
          message: 'We are investigating the lab biometric records with the instructor.',
          isInternal: false,
        });
      expect(publicRes.status).toBe(201);

      // 3. Faculty queries ticket details - sees BOTH internal note and public message
      const staffView = await request(app)
        .get(`/api/support/tickets/${ticketId}`)
        .set('Cookie', faculty1Cookie);

      expect(staffView.status).toBe(200);
      const staffMessages = staffView.body.data.messages;
      expect(staffMessages.some((m: any) => m.isInternal === true)).toBe(true);

      // 4. Student queries ticket details - internal note MUST NOT BE PRESENT in the payload
      const studentView = await request(app)
        .get(`/api/support/tickets/${ticketId}`)
        .set('Cookie', student1Cookie);

      expect(studentView.status).toBe(200);
      const studentMessages = studentView.body.data.messages;
      expect(studentMessages.every((m: any) => m.isInternal === false)).toBe(true);
      expect(studentMessages.some((m: any) => m.message.includes('biometric logs'))).toBe(false);
      expect(studentMessages.some((m: any) => m.message.includes('investigating'))).toBe(true);
    });

    it('rejects student attempting to post an internal note (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/support/tickets/${ticketId}/messages`)
        .set('Cookie', student1Cookie)
        .send({
          message: 'Student trying to set isInternal to true',
          isInternal: true,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('6. State Machine Transitions, Assignment & Resolution', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          subject: 'ERP timetable schedule clash',
          description: 'Two core elective lectures scheduled at the same time slot on Wednesdays.',
          category: 'ACADEMIC',
        });
      ticketId = res.body.data.id;
    });

    it('allows authorized staff to assign ticket to a specific staff member', async () => {
      const res = await request(app)
        .post(`/api/support/tickets/${ticketId}/assign`)
        .set('Cookie', adminCookie)
        .send({
          assignedStaffId: FACULTY1_USER_ID,
          reason: 'Assigned to department coordinator for course rescheduling',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.assignedStaffId).toBe(FACULTY1_USER_ID);
      expect(res.body.data.status).toBe('IN_PROGRESS');

      // Verify audit log
      const audits = await prisma.ticketAuditLog.findMany({
        where: { ticketId, action: 'TICKET_ASSIGNED' },
      });
      expect(audits.length).toBe(1);
      expect(audits[0].performedById).toBe(ADMIN_USER_ID);
    });

    it('validates state transitions and rejects illegal transitions (e.g. CLOSED to WAITING_FOR_STUDENT)', async () => {
      // 1. Transition OPEN -> IN_PROGRESS
      const step1 = await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', faculty1Cookie)
        .send({
          status: 'IN_PROGRESS',
          reason: 'Under review by faculty advisor',
        });
      expect(step1.status).toBe(200);
      expect(step1.body.data.status).toBe('IN_PROGRESS');

      // 2. Transition IN_PROGRESS -> RESOLVED with resolution notes
      const step2 = await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', faculty1Cookie)
        .send({
          status: 'RESOLVED',
          reason: 'Timetable section B adjusted to slot 3',
          resolutionNotes: 'Wednesday slot moved to prevent conflict with Section A.',
        });
      expect(step2.status).toBe(200);
      expect(step2.body.data.status).toBe('RESOLVED');
      expect(step2.body.data.resolutionNotes).toContain('prevent conflict');

      // 3. Transition RESOLVED -> CLOSED
      const step3 = await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', adminCookie)
        .send({
          status: 'CLOSED',
          reason: 'Resolution verified and closed by registrar admin',
        });
      expect(step3.status).toBe(200);
      expect(step3.body.data.status).toBe('CLOSED');

      // 4. Illegal transition: CLOSED -> WAITING_FOR_STUDENT should be rejected (400)
      const step4 = await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', adminCookie)
        .send({
          status: 'WAITING_FOR_STUDENT',
          reason: 'Illegal state regression attempt',
        });
      expect(step4.status).toBe(400);
      expect(step4.body.success).toBe(false);
    });

    it('enforces resolution notes when resolving a ticket', async () => {
      // Transition to IN_PROGRESS first
      await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', faculty1Cookie)
        .send({ status: 'IN_PROGRESS' });

      // Attempt to resolve without resolution notes
      const res = await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', faculty1Cookie)
        .send({
          status: 'RESOLVED',
          reason: 'Resolving ticket without resolution explanation',
          // missing resolutionNotes
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Resolution notes are required');
    });
  });

  describe('7. Reopening Workflow', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          subject: 'Hostel WiFi connectivity',
          description: 'No internet access on 2nd floor access point.',
          category: 'IT_PORTAL',
        });
      ticketId = res.body.data.id;

      // Faculty resolves ticket
      await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', faculty1Cookie)
        .send({ status: 'IN_PROGRESS' });

      await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', faculty1Cookie)
        .send({
          status: 'RESOLVED',
          resolutionNotes: 'Access point rebooted and firmware updated.',
        });
    });

    it('allows student to reopen a RESOLVED ticket with valid reason, transitioning status to IN_PROGRESS', async () => {
      const res = await request(app)
        .post(`/api/support/tickets/${ticketId}/reopen`)
        .set('Cookie', student1Cookie)
        .send({
          reason: 'WiFi worked for 1 hour but has dropped again with authentication timeout.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');

      // Check audit trail
      const audits = await prisma.ticketAuditLog.findMany({
        where: { ticketId, action: 'TICKET_REOPENED' },
      });
      expect(audits.length).toBe(1);
      expect(audits[0].performedById).toBe(STUDENT1_USER_ID);
      expect(audits[0].previousStatus).toBe('RESOLVED');
      expect(audits[0].newStatus).toBe('IN_PROGRESS');
    });

    it('rejects student reopening request without a reason', async () => {
      const res = await request(app)
        .post(`/api/support/tickets/${ticketId}/reopen`)
        .set('Cookie', student1Cookie)
        .send({
          reason: '',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('rejects student attempting to reopen a CLOSED ticket', async () => {
      // Admin closes the ticket
      await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', adminCookie)
        .send({
          status: 'CLOSED',
          reason: 'Ticket closed by administrative office',
        });

      // Student tries to reopen closed ticket
      const res = await request(app)
        .post(`/api/support/tickets/${ticketId}/reopen`)
        .set('Cookie', student1Cookie)
        .send({
          reason: 'Still encountering issues with connection',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Only RESOLVED tickets can be reopened by students');
    });
  });

  describe('8. Database Immutability Trigger on Audit Logs', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          subject: 'Audit immutability test ticket',
          description: 'Testing that PostgreSQL triggers prevent tampering with ticket_audit_logs.',
          category: 'GENERAL_INQUIRY',
        });
      ticketId = res.body.data.id;
    });

    it('blocks direct SQL UPDATE on ticket_audit_logs via trg_ticket_audit_logs_immutable', async () => {
      const audit = await prisma.ticketAuditLog.findFirst({
        where: { ticketId },
      });
      expect(audit).not.toBeNull();

      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE ticket_audit_logs SET action = 'TAMPERED' WHERE id = '${audit!.id}';`
        )
      ).rejects.toThrow();
    });

    it('blocks direct SQL DELETE on ticket_audit_logs via trg_ticket_audit_logs_immutable', async () => {
      const audit = await prisma.ticketAuditLog.findFirst({
        where: { ticketId },
      });
      expect(audit).not.toBeNull();

      await expect(
        prisma.$executeRawUnsafe(
          `DELETE FROM ticket_audit_logs WHERE id = '${audit!.id}';`
        )
      ).rejects.toThrow();
    });
  });
});
