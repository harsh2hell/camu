import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { sessionRepository } from '../src/repositories/session.repository.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { notificationService } from '../src/services/notification.service.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 11: Notification & Communication Center Test Suite', () => {
  let student1Cookie: string[];
  let student2Cookie: string[];
  let facultyCookie: string[];
  let adminCookie: string[];

  const STUDENT1_USER_ID = 'a0000000-0000-4000-8000-000000000001'; // Harendra Pratap Singh
  const STUDENT2_USER_ID = 'a0000000-0000-4000-8000-000000000003'; // Aaditya Verma
  const FACULTY_USER_ID = 'a0000000-0000-4000-8000-000000000002'; // Dr. Rajesh Sharma
  const ADMIN_USER_ID = 'a0000000-0000-4000-8000-000000000099';

  beforeEach(async () => {
    sessionRepository.clearMemoryStore();
    clearRateLimitStore();

    // Authenticate Student 1
    const s1Res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'student.dev@dgu.ac.in', password: 'Password@Dev123' });
    student1Cookie = getCookies(s1Res);

    // Authenticate Student 2
    const s2Res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'aaditya.dev@dgu.ac.in', password: 'Password@Dev123' });
    student2Cookie = getCookies(s2Res);

    // Authenticate Faculty
    const fRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'faculty.dev@dgu.ac.in', password: 'Password@Dev123' });
    facultyCookie = getCookies(fRes);

    // Authenticate Admin
    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin.dev@dgu.ac.in', password: 'Password@Dev123' });
    adminCookie = getCookies(aRes);
  });

  afterEach(async () => {
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE notifications CASCADE;');
      await prisma.$executeRawUnsafe('TRUNCATE TABLE ticket_audit_logs CASCADE;');
      await prisma.$executeRawUnsafe('TRUNCATE TABLE ticket_messages CASCADE;');
      await prisma.$executeRawUnsafe('TRUNCATE TABLE support_tickets CASCADE;');
      await prisma.$executeRawUnsafe("UPDATE leave_applications SET status = 'WITHDRAWN' WHERE title LIKE 'Notification Test Leave%';");
    } catch {
      // ignore
    }
  });

  // ============================================================================
  // 1. Authentication & Session Scoping
  // ============================================================================
  describe('1. Authentication & Session Validation', () => {
    it('1.1 should reject unauthenticated requests to GET /api/notifications with 401', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('1.2 should reject unauthenticated requests to GET /api/notifications/unread-count with 401', async () => {
      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(401);
    });

    it('1.3 should reject unauthenticated requests to PATCH /api/notifications/:id/read with 401', async () => {
      const res = await request(app).patch('/api/notifications/00000000-0000-0000-0000-000000000000/read').send({});
      expect(res.status).toBe(401);
    });

    it('1.4 should reject unauthenticated requests to PATCH /api/notifications/mark-all-read with 401', async () => {
      const res = await request(app).patch('/api/notifications/mark-all-read').send({});
      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // 2. Recipient Isolation & Anti-IDOR Protections
  // ============================================================================
  describe('2. Recipient Isolation & Anti-IDOR Protections', () => {
    it('2.1 should strictly isolate notification queries to the session user', async () => {
      // Seed 1 notification for Student 1 and 1 for Student 2
      await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'SYSTEM',
        title: 'Welcome Student 1',
        message: 'Your portal access is active.',
        priority: 'LOW',
      });

      await notificationService.sendNotification({
        recipientId: STUDENT2_USER_ID,
        type: 'SYSTEM',
        title: 'Welcome Student 2',
        message: 'Your portal access is active.',
        priority: 'LOW',
      });

      // Student 1 fetches notifications
      const s1Res = await request(app)
        .get('/api/notifications')
        .set('Cookie', student1Cookie);
      expect(s1Res.status).toBe(200);
      expect(s1Res.body.data.notifications).toHaveLength(1);
      expect(s1Res.body.data.notifications[0].title).toBe('Welcome Student 1');

      // Student 2 fetches notifications
      const s2Res = await request(app)
        .get('/api/notifications')
        .set('Cookie', student2Cookie);
      expect(s2Res.status).toBe(200);
      expect(s2Res.body.data.notifications).toHaveLength(1);
      expect(s2Res.body.data.notifications[0].title).toBe('Welcome Student 2');
    });

    it('2.2 should prevent Student 1 from marking Student 2 notification as read with 404', async () => {
      const s2Notif = await notificationService.sendNotification({
        recipientId: STUDENT2_USER_ID,
        type: 'SYSTEM',
        title: 'Confidential Alert',
        message: 'Private message for Student 2',
      });

      // Student 1 attempts to mark Student 2's notification as read
      const res = await request(app)
        .patch(`/api/notifications/${s2Notif!.id}/read`)
        .set('Cookie', student1Cookie)
        .send({});

      expect([403, 404]).toContain(res.status);
    });

    it('2.3 should prevent Student 1 from deleting Student 2 notification with 403 or 404', async () => {
      const s2Notif = await notificationService.sendNotification({
        recipientId: STUDENT2_USER_ID,
        type: 'SYSTEM',
        title: 'Confidential Notice',
        message: 'Private message for Student 2',
      });

      // Student 1 attempts to delete Student 2's notification
      const res = await request(app)
        .delete(`/api/notifications/${s2Notif!.id}`)
        .set('Cookie', student1Cookie);

      expect([403, 404]).toContain(res.status);
    });

    it('2.4 should strictly scope unread count to the authenticated recipient', async () => {
      // Create 2 unread notifications for Student 1 and 1 for Student 2
      await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'NOTICE',
        title: 'S1 Notif 1',
        message: 'Message 1',
      });
      await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'NOTICE',
        title: 'S1 Notif 2',
        message: 'Message 2',
      });
      await notificationService.sendNotification({
        recipientId: STUDENT2_USER_ID,
        type: 'NOTICE',
        title: 'S2 Notif 1',
        message: 'Message 1',
      });

      const s1Res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', student1Cookie);
      expect(s1Res.status).toBe(200);
      expect(s1Res.body.data.unreadCount).toBe(2);

      const s2Res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', student2Cookie);
      expect(s2Res.status).toBe(200);
      expect(s2Res.body.data.unreadCount).toBe(1);
    });
  });

  // ============================================================================
  // 3. Read Semantics & Idempotency
  // ============================================================================
  describe('3. Read Semantics & Idempotency', () => {
    it('3.1 should mark a single notification as read idempotently', async () => {
      const notif = await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'ASSIGNMENT',
        title: 'Assignment Released',
        message: 'New lab assignment available.',
      });

      // Initial unread count should be 1
      const countBefore = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', student1Cookie);
      expect(countBefore.body.data.unreadCount).toBe(1);

      // First mark as read
      const res1 = await request(app)
        .patch(`/api/notifications/${notif!.id}/read`)
        .set('Cookie', student1Cookie)
        .send({});
      expect(res1.status).toBe(200);
      expect(res1.body.data.isRead).toBe(true);
      expect(res1.body.data.readAt).toBeDefined();

      // Second mark as read (idempotent call)
      const res2 = await request(app)
        .patch(`/api/notifications/${notif!.id}/read`)
        .set('Cookie', student1Cookie)
        .send({});
      expect(res2.status).toBe(200);
      expect(res2.body.data.isRead).toBe(true);

      // Unread count should now be 0
      const countAfter = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', student1Cookie);
      expect(countAfter.body.data.unreadCount).toBe(0);
    });

    it('3.2 should mark all notifications as read in bulk', async () => {
      await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'FINANCE',
        title: 'Fee Invoice 1',
        message: 'Invoice generated.',
      });
      await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'NOTICE',
        title: 'Campus Notice 1',
        message: 'Notice generated.',
      });

      const res = await request(app)
        .patch('/api/notifications/mark-all-read')
        .set('Cookie', student1Cookie)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(2);

      const count = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', student1Cookie);
      expect(count.body.data.unreadCount).toBe(0);
    });

    it('3.3 should mark all notifications of a specific type as read in bulk', async () => {
      await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'FINANCE',
        title: 'Finance Alert',
        message: 'Receipt ready.',
      });
      await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'NOTICE',
        title: 'Notice Alert',
        message: 'Notice ready.',
      });

      // Mark only FINANCE notifications as read
      const res = await request(app)
        .patch('/api/notifications/mark-all-read')
        .set('Cookie', student1Cookie)
        .send({ type: 'FINANCE' });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(1);

      // Unread count should now be 1 (the NOTICE remains unread)
      const count = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', student1Cookie);
      expect(count.body.data.unreadCount).toBe(1);
    });
  });

  // ============================================================================
  // 4. Duplicate Event Prevention & Idempotency Keys
  // ============================================================================
  describe('4. Duplicate Event Prevention & Idempotency Keys', () => {
    it('4.1 should prevent duplicate notifications when the same idempotency key is dispatched', async () => {
      const idempotencyKey = 'EVENT_UNIQUE_TEST_101';

      // First dispatch
      const first = await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'SUPPORT_TICKET',
        title: 'Support Ticket #T-101',
        message: 'Staff replied to your ticket.',
        idempotencyKey,
      });
      expect(first).toBeDefined();

      // Duplicate dispatch
      const second = await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'SUPPORT_TICKET',
        title: 'Support Ticket #T-101',
        message: 'Staff replied to your ticket (retry).',
        idempotencyKey,
      });

      expect(second).toBeDefined();
      expect(first!.id).toBe(second!.id);

      // Database should contain exactly 1 notification
      const count = await prisma.notification.count({
        where: { recipientId: STUDENT1_USER_ID, idempotencyKey },
      });
      expect(count).toBe(1);
    });

    it('4.2 should safely handle concurrent duplicate dispatches without creating duplicate rows', async () => {
      const idempotencyKey = 'CONCURRENT_TEST_202';

      const results = await Promise.all([
        notificationService.sendNotification({
          recipientId: STUDENT1_USER_ID,
          type: 'ASSIGNMENT',
          title: 'Concurrent Test',
          message: 'Concurrent submission test',
          idempotencyKey,
        }),
        notificationService.sendNotification({
          recipientId: STUDENT1_USER_ID,
          type: 'ASSIGNMENT',
          title: 'Concurrent Test',
          message: 'Concurrent submission test',
          idempotencyKey,
        }),
      ]);

      expect(results[0]?.id).toBe(results[1]?.id);

      const dbRows = await prisma.notification.count({
        where: { recipientId: STUDENT1_USER_ID, idempotencyKey },
      });
      expect(dbRows).toBe(1);
    });
  });

  // ============================================================================
  // 5. Cross-Module Event Integration & Internal Privacy
  // ============================================================================
  describe('5. Cross-Module Event Integration & Internal Privacy', () => {
    it('5.1 should trigger a notification when an authorized staff member posts a public reply on a support ticket', async () => {
      // Student 1 submits a ticket
      const ticketRes = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          category: 'ACADEMIC',
          subject: 'Question on Database Elective',
          description: 'Need clarification on prerequisites for CS401.',
        });
      expect(ticketRes.status).toBe(201);
      const ticketId = ticketRes.body.data.id;

      // Faculty posts a public reply
      const replyRes = await request(app)
        .post(`/api/support/tickets/${ticketId}/messages`)
        .set('Cookie', facultyCookie)
        .send({
          message: 'The prerequisite for CS401 is Data Structures (CS201).',
          isInternal: false,
        });
      expect(replyRes.status).toBe(201);

      // Student 1 should have received a notification
      const notifRes = await request(app)
        .get('/api/notifications?type=SUPPORT_TICKET')
        .set('Cookie', student1Cookie);
      expect(notifRes.status).toBe(200);
      expect(notifRes.body.data.notifications.length).toBeGreaterThanOrEqual(1);

      const target = notifRes.body.data.notifications.find(
        (n: any) => n.resourceId === ticketId
      );
      expect(target).toBeDefined();
      expect(target.title).toContain('Support Ticket');
      expect(target.message).toContain('responded to your ticket');
    });

    it('5.2 should NEVER send a student notification or leak content for internal staff notes', async () => {
      // Student 1 submits a ticket
      const ticketRes = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          category: 'FINANCE',
          subject: 'Fee Fine Inquiry',
          description: 'Why was late fee charged?',
        });
      expect(ticketRes.status).toBe(201);
      const ticketId = ticketRes.body.data.id;

      // Clear notifications before note
      await prisma.notification.deleteMany({ where: { recipientId: STUDENT1_USER_ID } });

      // Faculty posts an INTERNAL note (isInternal: true)
      const internalRes = await request(app)
        .post(`/api/support/tickets/${ticketId}/messages`)
        .set('Cookie', facultyCookie)
        .send({
          message: 'INTERNAL NOTE: Student payment failed initially; do not waive fee unless HOD approves.',
          isInternal: true,
        });
      expect(internalRes.status).toBe(201);

      // Student 1 must NOT receive any notification
      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', student1Cookie);
      expect(notifRes.status).toBe(200);
      expect(notifRes.body.data.notifications).toHaveLength(0);
    });

    it('5.3 should notify student when support ticket status changes to RESOLVED', async () => {
      // Student 1 submits a ticket
      const ticketRes = await request(app)
        .post('/api/support/tickets')
        .set('Cookie', student1Cookie)
        .send({
          category: 'GENERAL_INQUIRY',
          subject: 'Library timings during exam week',
          description: 'Will the reading room remain open till midnight?',
        });
      expect(ticketRes.status).toBe(201);
      const ticketId = ticketRes.body.data.id;

      // Faculty resolves the ticket
      const statusRes = await request(app)
        .patch(`/api/support/tickets/${ticketId}/status`)
        .set('Cookie', facultyCookie)
        .send({
          status: 'RESOLVED',
          resolutionNotes: 'Reading rooms are open 24/7 during exam weeks with security clearance.',
        });
      expect(statusRes.status).toBe(200);

      // Student 1 receives RESOLVED notification
      const notifRes = await request(app)
        .get('/api/notifications?type=SUPPORT_TICKET')
        .set('Cookie', student1Cookie);
      expect(notifRes.status).toBe(200);

      const target = notifRes.body.data.notifications.find(
        (n: any) => n.idempotencyKey === `TICKET_STATUS:${ticketId}:RESOLVED`
      );
      expect(target).toBeDefined();
      expect(target.title).toContain('Resolved');
    });

    it('5.4 should notify student when leave/OD application is decided by approver', async () => {
      // Submit a leave application for Student 1 with unique future date
      const timestamp = Date.now();
      const submitRes = await request(app)
        .post('/api/leave-od/applications')
        .set('Cookie', student1Cookie)
        .send({
          category: 'LEAVE',
          leaveType: 'CASUAL',
          title: `Notification Test Leave ${timestamp}`,
          startDate: '2028-10-15',
          endDate: '2028-10-17',
          reason: 'Family function attendance requiring travel.',
        });
      expect(submitRes.status).toBe(201);
      const applicationId = submitRes.body.data.id;

      // Mentor/Faculty decides the application
      const decideRes = await request(app)
        .post(`/api/leave-od/approvals/${applicationId}/decide`)
        .set('Cookie', facultyCookie)
        .send({
          action: 'APPROVE',
          reason: 'Leave request reviewed and approved.',
        });
      expect(decideRes.status).toBe(200);

      // Student 1 should have received a LEAVE_OD notification
      const notifRes = await request(app)
        .get('/api/notifications?type=LEAVE_OD')
        .set('Cookie', student1Cookie);
      expect(notifRes.status).toBe(200);

      const target = notifRes.body.data.notifications.find(
        (n: any) => n.resourceId === applicationId
      );
      expect(target).toBeDefined();
      expect(target.title).toContain('Leave/OD Application Approved');
    });

    it('5.5 should notify student when fee payment is reconciled/confirmed', async () => {
      // Find an issued invoice for Student 1
      const invoice = await prisma.feeInvoice.findFirst({
        where: { studentId: STUDENT1_USER_ID, status: 'ISSUED' },
      });

      if (invoice) {
        // Admin records offline payment reconciliation
        const payRes = await request(app)
          .post('/api/finance/admin/reconcile')
          .set('Cookie', adminCookie)
          .send({
            invoiceId: invoice.id,
            amount: 500,
            paymentMode: 'CHALLAN',
            transactionRef: `REC-NOTIF-${Date.now()}`,
            notes: 'Test payment for notification verification',
          });
        expect(payRes.status).toBe(200);

        // Student 1 should have received a FINANCE notification
        const notifRes = await request(app)
          .get('/api/notifications?type=FINANCE')
          .set('Cookie', student1Cookie);
        expect(notifRes.status).toBe(200);
        expect(notifRes.body.data.notifications.length).toBeGreaterThanOrEqual(1);
        expect(notifRes.body.data.notifications[0].title).toBe('Fee Payment Confirmed');
      }
    });
  });

  // ============================================================================
  // 6. Notification Destination & Deletion
  // ============================================================================
  describe('6. Notification Destination & Deletion', () => {
    it('6.1 should allow user to view authorized notification destination metadata', async () => {
      const notif = await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'NOTICE',
        title: 'New Examination Guidelines',
        message: 'Review examination rules in the portal.',
        resourceType: 'NOTICE',
        resourceId: 'notif-res-123',
        actionUrl: '/student-dashboard?tab=notices',
      });

      const res = await request(app)
        .get(`/api/notifications/${notif!.id}/destination`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.actionUrl).toBe('/student-dashboard?tab=notices');
      expect(res.body.data.resourceType).toBe('NOTICE');
      expect(res.body.data.resourceId).toBe('notif-res-123');
    });

    it('6.2 should allow user to delete their own notification', async () => {
      const notif = await notificationService.sendNotification({
        recipientId: STUDENT1_USER_ID,
        type: 'SYSTEM',
        title: 'Dismissable alert',
        message: 'This message can be dismissed.',
      });

      const delRes = await request(app)
        .delete(`/api/notifications/${notif!.id}`)
        .set('Cookie', student1Cookie);

      expect(delRes.status).toBe(200);

      // Verify deletion in database
      const inDb = await prisma.notification.findUnique({
        where: { id: notif!.id },
      });
      expect(inDb).toBeNull();
    });
  });
});
