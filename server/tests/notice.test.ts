import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { sessionRepository } from '../src/repositories/session.repository.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { noticeRepository } from '../src/repositories/notice.repository.js';
import { FileStorage } from '../src/lib/fileStorage.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 8: Notices & Announcements Management Suite', () => {
  let studentCookie: string[];
  let facultyCookie: string[];
  let adminCookie: string[];

  const SOET_DEPT_ID = 'd0000000-0000-4000-8000-000000000001';
  const BTECH_CSE_ID = 'e0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    sessionRepository.clearMemoryStore();
    clearRateLimitStore();

    // Clean up test notices and audit logs created during test runs
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE notice_audit_logs CASCADE;');
      await prisma.$executeRawUnsafe("DELETE FROM notice_acknowledgements WHERE notice_id::text NOT LIKE 'd0000001-%';");
      await prisma.$executeRawUnsafe("DELETE FROM notices WHERE id::text NOT LIKE 'd0000001-%';");
    } catch {
      // ignore
    }

    // Authenticate Student (B.Tech CSE, Sem 3, SOET Dept)
    const sRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'student.dev@dgu.ac.in', password: 'Password@Dev123' });
    studentCookie = getCookies(sRes);

    // Authenticate Faculty (Dr. Rajesh Sharma, SOET Dept)
    const fRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'faculty.dev@dgu.ac.in', password: 'Password@Dev123' });
    facultyCookie = getCookies(fRes);

    // Authenticate Admin (Registrar Admin)
    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin.dev@dgu.ac.in', password: 'Password@Dev123' });
    adminCookie = getCookies(aRes);
  });

  afterEach(async () => {
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE notice_audit_logs CASCADE;');
      await prisma.$executeRawUnsafe("DELETE FROM notice_acknowledgements WHERE notice_id::text NOT LIKE 'd0000001-%';");
      await prisma.$executeRawUnsafe("DELETE FROM notices WHERE id::text NOT LIKE 'd0000001-%';");
    } catch {
      // ignore
    }
  });

  describe('1. Authentication & RBAC Authorization Controls', () => {
    it('rejects unauthenticated requests to recipient feed with 401', async () => {
      const res = await request(app).get('/api/notices');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to management feed with 401', async () => {
      const res = await request(app).get('/api/notices/manage');
      expect(res.status).toBe(401);
    });

    it('prevents students from accessing the management feed with 403', async () => {
      const res = await request(app)
        .get('/api/notices/manage')
        .set('Cookie', studentCookie);
      expect(res.status).toBe(403);
    });

    it('prevents students from authoring a notice with 403', async () => {
      const res = await request(app)
        .post('/api/notices')
        .set('Cookie', studentCookie)
        .send({
          title: 'Unauthorized Student Circular',
          content: 'This should be strictly prohibited by server RBAC.',
          category: 'ACADEMIC',
          priority: 'NORMAL',
        });
      expect(res.status).toBe(403);
    });

    it('prevents students from previewing audience with 403', async () => {
      const res = await request(app)
        .post('/api/notices/preview-audience')
        .set('Cookie', studentCookie)
        .send({});
      expect(res.status).toBe(403);
    });

    it('allows faculty and admin to access management feed', async () => {
      const fRes = await request(app)
        .get('/api/notices/manage')
        .set('Cookie', facultyCookie);
      expect(fRes.status).toBe(200);
      expect(Array.isArray(fRes.body.data)).toBe(true);

      const aRes = await request(app)
        .get('/api/notices/manage')
        .set('Cookie', adminCookie);
      expect(aRes.status).toBe(200);
      expect(Array.isArray(aRes.body.data)).toBe(true);
    });
  });

  describe('2. Author Identity Enforcement & Creation', () => {
    it('creates a notice draft and binds session identity as author', async () => {
      const res = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Faculty Draft Notice',
          content: 'Detailed guidelines for research grant applications.',
          category: 'ACADEMIC',
          priority: 'HIGH',
          status: 'DRAFT',
        });

      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.priority).toBe('HIGH');
      expect(res.body.data.title).toBe('Faculty Draft Notice');
      expect(res.body.data.postedById).toBeDefined();
    });

    it('calculates audience preview correctly for staff author', async () => {
      const res = await request(app)
        .post('/api/notices/preview-audience')
        .set('Cookie', facultyCookie)
        .send({
          targetRole: 'STUDENT',
          departmentId: SOET_DEPT_ID,
          programId: BTECH_CSE_ID,
          targetSemester: 3,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.targetRole).toBe('STUDENT');
      expect(res.body.data.estimatedRecipientCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Audience Scoping & Recipient Isolation', () => {
    it('isolates role-specific notices between students and faculty', async () => {
      // 1. Create notice strictly for FACULTY
      const facNotice = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Faculty-Only Department Meeting',
          content: 'Confidential agenda for internal faculty review.',
          category: 'ADMINISTRATIVE',
          priority: 'HIGH',
          targetRole: 'FACULTY',
          status: 'PUBLISHED',
        });
      expect(facNotice.status).toBe(201);

      // 2. Create notice strictly for STUDENTS
      const stuNotice = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Student-Only Campus Sports Registration',
          content: 'Annual sports meet registrations are now open.',
          category: 'EVENT',
          priority: 'NORMAL',
          targetRole: 'STUDENT',
          status: 'PUBLISHED',
        });
      expect(stuNotice.status).toBe(201);

      // Check Student recipient feed
      const stuFeed = await request(app)
        .get('/api/notices')
        .set('Cookie', studentCookie);
      expect(stuFeed.status).toBe(200);
      const stuTitles = stuFeed.body.data.map((n: any) => n.title);
      expect(stuTitles).toContain('Student-Only Campus Sports Registration');
      expect(stuTitles).not.toContain('Faculty-Only Department Meeting');

      // Check Faculty recipient feed
      const facFeed = await request(app)
        .get('/api/notices')
        .set('Cookie', facultyCookie);
      expect(facFeed.status).toBe(200);
      const facTitles = facFeed.body.data.map((n: any) => n.title);
      expect(facTitles).toContain('Faculty-Only Department Meeting');
      expect(facTitles).not.toContain('Student-Only Campus Sports Registration');
    });

    it('isolates notices targeted to other semesters', async () => {
      // Student is in Semester 3
      // Create notice for Semester 6 only (hidden from Sem 3 student)
      const sem6Notice = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Semester 6 Major Project Submission',
          content: 'Capstone review schedule for final-year students.',
          category: 'ACADEMIC',
          targetRole: 'STUDENT',
          targetSemester: 6,
          status: 'PUBLISHED',
        });
      expect(sem6Notice.status).toBe(201);

      // Create notice for Semester 3 (visible to Sem 3 student)
      const sem3Notice = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Semester 3 Data Structures Hackathon',
          content: 'Algorithmic contest schedule for 3rd semester CSE students.',
          category: 'ACADEMIC',
          targetRole: 'STUDENT',
          targetSemester: 3,
          status: 'PUBLISHED',
        });
      expect(sem3Notice.status).toBe(201);

      const res = await request(app)
        .get('/api/notices')
        .set('Cookie', studentCookie);
      expect(res.status).toBe(200);

      const titles = res.body.data.map((n: any) => n.title);
      expect(titles).toContain('Semester 3 Data Structures Hackathon');
      expect(titles).not.toContain('Semester 6 Major Project Submission');
    });
  });

  describe('4. Lifecycle State Transitions & Durable Scheduling', () => {
    it('draft notices are hidden from recipient feed until published', async () => {
      const createRes = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Under Review Exam Timetable',
          content: 'Preliminary dates for review only.',
          category: 'EXAM',
          status: 'DRAFT',
        });
      expect(createRes.status).toBe(201);
      const noticeId = createRes.body.data.id;

      // Check recipient feed does not contain draft
      const feedRes1 = await request(app)
        .get('/api/notices')
        .set('Cookie', studentCookie);
      const titles1 = feedRes1.body.data.map((n: any) => n.title);
      expect(titles1).not.toContain('Under Review Exam Timetable');

      // Publish immediately
      const pubRes = await request(app)
        .post(`/api/notices/${noticeId}/publish`)
        .set('Cookie', facultyCookie)
        .send({ mode: 'IMMEDIATE' });
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.status).toBe('PUBLISHED');
      expect(pubRes.body.data.publishedAt).toBeDefined();

      // Recipient feed now contains published notice
      const feedRes2 = await request(app)
        .get('/api/notices')
        .set('Cookie', studentCookie);
      const titles2 = feedRes2.body.data.map((n: any) => n.title);
      expect(titles2).toContain('Under Review Exam Timetable');
    });

    it('scheduled notices remain hidden until publishAt and processor runs', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const schedRes = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Future Scheduled Convocation Notice',
          content: 'Convocation gowns registration.',
          category: 'EVENT',
          status: 'SCHEDULED',
          publishAt: futureDate,
        });
      expect(schedRes.status).toBe(201);
      const noticeId = schedRes.body.data.id;

      // Student feed cannot see future scheduled notice
      const feed1 = await request(app).get('/api/notices').set('Cookie', studentCookie);
      expect(feed1.body.data.map((n: any) => n.id)).not.toContain(noticeId);

      // Artificially backdate publish_at in DB to simulate arrival of publication time
      await prisma.notice.update({
        where: { id: noticeId },
        data: { publishAt: new Date(Date.now() - 1000) },
      });

      // Run scheduled processor via endpoint
      const procRes = await request(app)
        .post('/api/notices/process-scheduled')
        .set('Cookie', adminCookie);
      expect(procRes.status).toBe(200);
      expect(procRes.body.data.processedCount).toBeGreaterThanOrEqual(1);

      // Now student feed includes newly published notice
      const feed2 = await request(app).get('/api/notices').set('Cookie', studentCookie);
      expect(feed2.body.data.map((n: any) => n.id)).toContain(noticeId);
    });

    it('archives published notice and removes from recipient feed', async () => {
      const createRes = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Notice To Be Archived',
          content: 'This notice will be archived.',
          category: 'ADMINISTRATIVE',
          status: 'PUBLISHED',
        });
      const noticeId = createRes.body.data.id;

      // Archive it
      const archRes = await request(app)
        .post(`/api/notices/${noticeId}/archive`)
        .set('Cookie', facultyCookie);
      expect(archRes.status).toBe(200);
      expect(archRes.body.data.status).toBe('ARCHIVED');
      expect(archRes.body.data.archivedAt).toBeDefined();

      // Ensure hidden from recipient feed
      const feed = await request(app).get('/api/notices').set('Cookie', studentCookie);
      expect(feed.body.data.map((n: any) => n.id)).not.toContain(noticeId);
    });

    it('cancels notice requiring reason and prohibits publication after cancellation', async () => {
      const createRes = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Notice To Be Cancelled',
          content: 'Erroneous circular that must be recalled.',
          category: 'ACADEMIC',
          status: 'PUBLISHED',
        });
      const noticeId = createRes.body.data.id;

      // Rejects cancellation without reason
      const badCancel = await request(app)
        .post(`/api/notices/${noticeId}/cancel`)
        .set('Cookie', facultyCookie)
        .send({ reason: '' });
      expect(badCancel.status).toBe(422);

      // Cancels with valid reason
      const cancelRes = await request(app)
        .post(`/api/notices/${noticeId}/cancel`)
        .set('Cookie', facultyCookie)
        .send({ reason: 'Issued with clerical calculation error.' });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');

      // Attempting to publish cancelled notice returns 409 Conflict
      const pubRes = await request(app)
        .post(`/api/notices/${noticeId}/publish`)
        .set('Cookie', facultyCookie)
        .send({ mode: 'IMMEDIATE' });
      expect(pubRes.status).toBe(409);
    });
  });

  describe('5. Private Attachments & Audience Download Authorization', () => {
    it('allows authorized recipient to download attachment and forbids out-of-scope recipient', async () => {
      // 1. Prepare base64 test file with valid PDF magic bytes
      const testBuffer = Buffer.from('%PDF-1.4\nOfficial DBS Circular Attachment PDF Content');
      const base64Data = testBuffer.toString('base64');

      // 2. Create notice targeted ONLY to FACULTY with this attachment
      const facNotice = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Faculty Confidential Attachment Notice',
          content: 'Confidential departmental syllabus review attached.',
          category: 'ACADEMIC',
          targetRole: 'FACULTY',
          status: 'PUBLISHED',
          fileData: base64Data,
          fileName: 'official_exam_circular.pdf',
        });
      expect(facNotice.status).toBe(201);
      const noticeId = facNotice.body.data.id;

      // 3. Faculty downloads attachment successfully (200)
      const facDownload = await request(app)
        .get(`/api/notices/${noticeId}/attachment`)
        .set('Cookie', facultyCookie);
      expect(facDownload.status).toBe(200);
      expect(facDownload.headers['content-type']).toContain('application/pdf');

      // 4. Student (out-of-scope recipient) gets 403 Forbidden
      const stuDownload = await request(app)
        .get(`/api/notices/${noticeId}/attachment`)
        .set('Cookie', studentCookie);
      expect(stuDownload.status).toBe(403);

      // 5. Unauthenticated download gets 401
      const unauthDownload = await request(app)
        .get(`/api/notices/${noticeId}/attachment`);
      expect(unauthDownload.status).toBe(401);
    });
  });

  describe('6. Read Acknowledgement Tracking', () => {
    it('marks notice as acknowledged upon detail inspection and decrements unread counter', async () => {
      const createRes = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Mandatory Library Clearances Notice',
          content: 'All graduating students must verify library dues.',
          category: 'ADMINISTRATIVE',
          priority: 'URGENT',
          status: 'PUBLISHED',
        });
      const noticeId = createRes.body.data.id;

      // Initial feed inspection
      const feedRes1 = await request(app)
        .get('/api/notices')
        .set('Cookie', studentCookie);
      const targetNotice1 = feedRes1.body.data.find((n: any) => n.id === noticeId);
      expect(targetNotice1).toBeDefined();
      expect(targetNotice1.isAcknowledged).toBe(false);
      const initialUnread = feedRes1.body.unreadCount;

      // Student views notice details
      const detailRes = await request(app)
        .get(`/api/notices/${noticeId}`)
        .set('Cookie', studentCookie);
      expect(detailRes.status).toBe(200);

      // Feed inspection after viewing
      const feedRes2 = await request(app)
        .get('/api/notices')
        .set('Cookie', studentCookie);
      const targetNotice2 = feedRes2.body.data.find((n: any) => n.id === noticeId);
      expect(targetNotice2.isAcknowledged).toBe(true);
      expect(feedRes2.body.unreadCount).toBeLessThan(initialUnread);
    });
  });

  describe('7. Calendar Integration & Scoping', () => {
    it('drafts do not appear in calendar events, published notices do', async () => {
      // 1. Create a draft notice
      await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Draft Exam Never In Calendar',
          content: 'Unpublished draft exam.',
          category: 'EXAM',
          status: 'DRAFT',
        });

      // 2. Create a published notice
      await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Published Mid-Term Examination',
          content: 'Official exam announcement.',
          category: 'EXAM',
          status: 'PUBLISHED',
        });

      // Query calendar events for Student
      const calRes = await request(app)
        .get('/api/calendar/events?startDate=2026-01-01&endDate=2026-12-31')
        .set('Cookie', studentCookie);
      expect(calRes.status).toBe(200);

      const eventTitles = calRes.body.data.events.map((e: any) => e.title);
      expect(eventTitles).toContain('Published Mid-Term Examination');
      expect(eventTitles).not.toContain('Draft Exam Never In Calendar');
    });
  });

  describe('8. Audit Trail & Trigger Immutability', () => {
    it('records immutable audit logs for notice actions', async () => {
      // Create and publish notice
      const res = await request(app)
        .post('/api/notices')
        .set('Cookie', facultyCookie)
        .send({
          title: 'Audited University Circular',
          content: 'Action tracking validation.',
          category: 'ACADEMIC',
          status: 'DRAFT',
        });
      const noticeId = res.body.data.id;

      await request(app)
        .post(`/api/notices/${noticeId}/publish`)
        .set('Cookie', facultyCookie)
        .send({ mode: 'IMMEDIATE' });

      // Retrieve audit trail
      const auditRes = await request(app)
        .get(`/api/notices/${noticeId}/audit-trail`)
        .set('Cookie', facultyCookie);
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.length).toBeGreaterThanOrEqual(2);

      const actions = auditRes.body.data.map((log: any) => log.action);
      expect(actions).toContain('NOTICE_DRAFT_CREATED');
      expect(actions).toContain('NOTICE_PUBLISHED');

      // Attempt to mutate or delete audit log directly via SQL -> PostgreSQL trigger must abort!
      await expect(
        prisma.$executeRawUnsafe("UPDATE notice_audit_logs SET action = 'HACKED' WHERE notice_id = $1::uuid;", noticeId)
      ).rejects.toThrow();

      await expect(
        prisma.$executeRawUnsafe("DELETE FROM notice_audit_logs WHERE notice_id = $1::uuid;", noticeId)
      ).rejects.toThrow();
    });
  });
});
