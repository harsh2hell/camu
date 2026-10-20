import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../src/api/client';
import { getMyProfile, getMyAcademicRecords } from '../src/api/profile';
import { attendanceApi } from '../src/api/attendance';
import { timetableApi } from '../src/api/timetable';
import { assignmentApi } from '../src/api/assignment';
import { getStudentApplications, createLeaveApplication } from '../src/api/leave';
import { getRecipientNotices, getNoticeDetails } from '../src/api/notice';
import { getMyTickets, createTicket } from '../src/api/support';
import { financeApi } from '../src/api/finance';

describe('Phase 18: Student Portal Client API Integration & Contract Verification Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Profile & Academic Records Client API
  // ============================================================================
  describe('1. Student Profile & Academic Records', () => {
    it('1.1 should fetch current student profile via /profile/me', async () => {
      const mockProfile = {
        id: 'a0000000-0000-4000-8000-000000000001',
        fullName: 'Harendra Pratap Singh',
        rollNumber: '0251BTCS097',
        department: { id: 'd1', code: 'SOET', name: 'School of Engineering & Technology' },
        currentSemester: 6,
        status: 'ACTIVE',
      };

      vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 'success', data: mockProfile });

      const res = await getMyProfile();
      expect(res.data.rollNumber).toBe('0251BTCS097');
      expect(res.data.fullName).toBe('Harendra Pratap Singh');
      expect(apiClient.get).toHaveBeenCalledWith('/profile/me');
    });

    it('1.2 should fetch real academic records via /profile/academic-records', async () => {
      const mockRecords = {
        currentCgpa: 8.82,
        totalEnrolledCredits: 24,
        enrolledCourses: [
          { courseOfferingId: 'b1', courseCode: 'CS302', courseTitle: 'Algorithms', credits: 4 },
          { courseOfferingId: 'b2', courseCode: 'CS304', courseTitle: 'DBMS', credits: 4 },
        ],
      };

      vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 'success', data: mockRecords });

      const res = await getMyAcademicRecords();
      expect(res.data.currentCgpa).toBe(8.82);
      expect(res.data.enrolledCourses).toHaveLength(2);
      expect(apiClient.get).toHaveBeenCalledWith('/profile/academic-records');
    });
  });

  // ============================================================================
  // 2. Attendance & Timetable Integration
  // ============================================================================
  describe('2. Attendance & Timetable Integration', () => {
    it('2.1 should retrieve attendance summary and calculate accurate status', async () => {
      const mockSummary = {
        overallPercentage: 88.5,
        totalAttended: 31,
        totalConducted: 35,
        subjects: [
          { subjectInfo: { code: 'CS302', title: 'Algorithms', faculty: 'Dr. Sharma' }, attended: 18, conducted: 20, percentage: 90.0 },
        ],
      };

      vi.spyOn(apiClient, 'get').mockResolvedValue({ success: true, data: mockSummary });

      const summary = await attendanceApi.getMySummary();
      expect(summary.overallPercentage).toBe(88.5);
      expect(summary.subjects[0].percentage).toBe(90.0);
      expect(apiClient.get).toHaveBeenCalledWith('/attendance/my-summary');
    });

    it('2.2 should execute QR attendance check-in seamlessly with Phase 17 payload', async () => {
      const mockResult = {
        sessionId: 'session-xyz',
        courseCode: 'CS302',
        courseTitle: 'Algorithms',
        facultyName: 'Dr. Sharma',
        status: 'PRESENT' as const,
        studentId: 'student-1',
        studentName: 'Harendra Pratap Singh',
        markedAt: new Date().toISOString(),
        isAlreadyMarked: false,
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true, data: mockResult });

      const checkInResult = await attendanceApi.checkInWithQr('signed-qr-token-abc');

      expect(checkInResult.sessionId).toBe('session-xyz');
      expect(checkInResult.status).toBe('PRESENT');
      expect(apiClient.post).toHaveBeenCalledWith('/attendance/qr/check-in', {
        qrToken: 'signed-qr-token-abc',
      });
    });

    it('2.3 should fetch student timetable schedule', async () => {
      const mockSchedule = {
        academicYear: '2026-27',
        semester: 6,
        schedule: {
          Monday: [
            { id: '1', courseCode: 'CS302', courseTitle: 'Algorithms', facultyName: 'Dr. Sharma', room: 'Lab 3', startTime: '09:00', endTime: '10:00' },
          ],
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValue({ success: true, data: mockSchedule });

      const schedule = await timetableApi.getStudentSchedule();
      expect(schedule.schedule.Monday).toHaveLength(1);
      expect(apiClient.get).toHaveBeenCalledWith('/timetable/student');
    });
  });

  // ============================================================================
  // 3. LMS & Assignments Integration
  // ============================================================================
  describe('3. LMS & Assignment Submissions', () => {
    it('3.1 should fetch student assignments list without mock fixtures', async () => {
      const mockAssignments = [
        {
          id: 'asg-1',
          title: 'Dynamic Programming Problem Set',
          courseCode: 'CS302',
          courseTitle: 'Algorithms',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          maxMarks: 100,
          submission: null,
        },
        {
          id: 'asg-2',
          title: 'ER Diagram Project',
          courseCode: 'CS304',
          courseTitle: 'DBMS',
          dueDate: new Date(Date.now() - 86400000).toISOString(),
          maxMarks: 50,
          submission: {
            id: 'sub-1',
            status: 'GRADED',
            score: 48,
            feedback: 'Excellent normalization breakdown.',
          },
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 'success', data: mockAssignments });

      const assignments = await assignmentApi.getStudentAssignments();
      expect(assignments).toHaveLength(2);
      expect(assignments[0].submission).toBeNull();
      expect(assignments[1].submission?.score).toBe(48);
      expect(apiClient.get).toHaveBeenCalledWith('/assignments/student');
    });

    it('3.2 should submit student assignment with authentic payload', async () => {
      const mockSubmission = {
        id: 'sub-new',
        assignmentId: 'asg-1',
        submittedAt: new Date().toISOString(),
        status: 'SUBMITTED',
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 'success', data: mockSubmission });

      const res = await assignmentApi.submitAssignment('asg-1', {
        submissionText: 'Completed solutions for DP problem set.',
        submissionFileUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
      });

      expect(res.data.id).toBe('sub-new');
      expect(res.data.status).toBe('SUBMITTED');
      expect(apiClient.post).toHaveBeenCalledWith('/assignments/asg-1/submit', {
        submissionText: 'Completed solutions for DP problem set.',
        submissionFileUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
      });
    });
  });

  // ============================================================================
  // 4. Leave & OD Applications
  // ============================================================================
  describe('4. Leave & OD Applications', () => {
    it('4.1 should retrieve student applications via /leave-od/applications', async () => {
      const mockList = {
        status: 'success',
        count: 1,
        data: [
          {
            id: 'leave-1',
            category: 'LEAVE',
            leaveType: 'CASUAL',
            title: 'Medical checkup',
            status: 'APPROVED',
            totalDays: 2,
          },
        ],
        pagination: { page: 1, limit: 10, totalCount: 1, totalPages: 1 },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValue(mockList);

      const res = await getStudentApplications();
      expect(res.data).toHaveLength(1);
      expect(res.data[0].status).toBe('APPROVED');
      expect(apiClient.get).toHaveBeenCalledWith('/leave-od/applications');
    });

    it('4.2 should submit a formal leave application', async () => {
      const mockApp = {
        status: 'success',
        data: {
          id: 'leave-123',
          category: 'LEAVE' as const,
          leaveType: 'CASUAL',
          title: 'Attending IEEE Hackathon',
          startDate: '2026-10-25',
          endDate: '2026-10-26',
          reason: 'Hackathon participation',
          totalDays: 2,
          hasSupportingDocument: false,
          status: 'PENDING' as const,
          studentId: 'student-1',
          studentName: 'Harendra Pratap Singh',
          studentRollNumber: '0251BTCS097',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue(mockApp);

      const res = await createLeaveApplication({
        category: 'LEAVE',
        leaveType: 'CASUAL',
        title: 'Attending IEEE Hackathon',
        startDate: '2026-10-25',
        endDate: '2026-10-26',
        reason: 'Hackathon participation',
      });

      expect(res.data.id).toBe('leave-123');
      expect(res.data.status).toBe('PENDING');
      expect(apiClient.post).toHaveBeenCalledWith('/leave-od/applications', {
        category: 'LEAVE',
        leaveType: 'CASUAL',
        title: 'Attending IEEE Hackathon',
        startDate: '2026-10-25',
        endDate: '2026-10-26',
        reason: 'Hackathon participation',
      });
    });
  });

  // ============================================================================
  // 5. Institutional Notices & Helpdesk
  // ============================================================================
  describe('5. Notices & Helpdesk', () => {
    it('5.1 should fetch circular notices and inspect notice details', async () => {
      const mockFeed = {
        status: 'success',
        count: 1,
        unreadCount: 1,
        data: [
          {
            id: 'notice-1',
            title: 'Mid-Term Examination Schedule Released',
            category: 'EXAM',
            priority: 'HIGH' as const,
            status: 'PUBLISHED' as const,
            isPinned: true,
            hasAttachment: false,
            postedById: 'admin-1',
            authorName: 'Registrar Office',
            authorRole: 'REGISTRAR_ADMIN',
            isAcknowledged: false,
          },
        ],
        pagination: { page: 1, limit: 10, totalCount: 1, totalPages: 1 },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValue(mockFeed);

      const list = await getRecipientNotices();
      expect(list.data).toHaveLength(1);
      expect(apiClient.get).toHaveBeenCalledWith('/notices');

      const mockNotice = {
        status: 'success',
        data: mockFeed.data[0],
      };
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockNotice);

      const details = await getNoticeDetails('notice-1');
      expect(details.data.id).toBe('notice-1');
      expect(apiClient.get).toHaveBeenCalledWith('/notices/notice-1');
    });

    it('5.2 should create helpdesk tickets and retrieve ticket list', async () => {
      const mockTicket = {
        id: 'ticket-99',
        ticketNumber: 'TKT-2026-0099',
        subject: 'Transcript Verification',
        category: 'ACADEMIC',
        status: 'OPEN',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/support/tickets')) {
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({ data: mockTicket }),
          } as any);
        }
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [mockTicket], total: 1 }),
        } as any);
      });

      const created = await createTicket({
        category: 'ACADEMIC' as any,
        subject: 'Transcript Verification',
        description: 'Need verified transcript copy for internship application.',
        priority: 'HIGH' as any,
      });

      expect(created.ticketNumber).toBe('TKT-2026-0099');

      const tickets = await getMyTickets();
      expect(tickets.tickets).toHaveLength(1);
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 6. Finance & Transparent Payment Gateway
  // ============================================================================
  describe('6. Finance & Honest Payment Gateway', () => {
    it('6.1 should fetch real student fee ledger via /finance/student/ledger', async () => {
      const mockLedger = {
        totalInvoiced: 85000,
        totalPaid: 85000,
        totalOutstanding: 0,
        totalConcessions: 0,
        noDuesStatus: 'CLEARED' as const,
        activeInvoicesCount: 0,
        invoices: [],
        recentTransactions: [],
      };

      vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 'success', data: mockLedger });

      const ledger = await financeApi.getStudentLedger();
      expect(ledger.totalOutstanding).toBe(0);
      expect(ledger.noDuesStatus).toBe('CLEARED');
      expect(apiClient.get).toHaveBeenCalledWith('/finance/student/ledger');
    });

    it('6.2 should return GATEWAY_UNCONFIGURED status honestly on payment initiate', async () => {
      const mockPayResponse = {
        isConfigured: false,
        gatewayProvider: 'NONE',
        transactionRef: 'PAY-REF-2026-1021',
        status: 'GATEWAY_UNCONFIGURED',
        amount: 5000,
        invoiceId: 'inv-123',
        message: 'Payment gateway is currently unconfigured.',
        reconciliationInstructions: 'Please pay at DBS Accounts Office or via NEFT / RTGS.',
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue({ status: 'success', data: mockPayResponse });

      const payRes = await financeApi.initiatePayment({
        invoiceId: 'inv-123',
        amount: 5000,
      });

      expect(payRes.status).toBe('GATEWAY_UNCONFIGURED');
      expect(payRes.transactionRef).toBe('PAY-REF-2026-1021');
      expect(payRes.isConfigured).toBe(false);
      expect(apiClient.post).toHaveBeenCalledWith('/finance/student/pay', {
        invoiceId: 'inv-123',
        amount: 5000,
      });
    });
  });
});
