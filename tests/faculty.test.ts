import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from '../src/api/client';
import { attendanceApi } from '../src/api/attendance';
import { timetableApi } from '../src/api/timetable';
import { assignmentApi } from '../src/api/assignment';
import { getPendingApprovals, decideApplication } from '../src/api/leave';

describe('Phase 16: Faculty Portal Integration & Academic Workflows Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Faculty Course Discovery & Roster Loading', () => {
    it('1.1 should extract unique assigned courses from faculty timetable schedule', async () => {
      const mockWeeklySchedule = {
        academicYear: '2026-27',
        semester: 3,
        schedule: {
          Monday: [
            {
              id: 'slot-1',
              courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
              courseCode: 'CS302',
              courseTitle: 'Design & Analysis of Algorithms',
              sectionName: 'Section A',
            },
            {
              id: 'slot-2',
              courseOfferingId: 'b0000000-0000-4000-8000-000000000001', // duplicate course offering on same day
              courseCode: 'CS302',
              courseTitle: 'Design & Analysis of Algorithms',
              sectionName: 'Section A',
            },
          ],
          Tuesday: [],
          Wednesday: [
            {
              id: 'slot-3',
              courseOfferingId: 'b0000000-0000-4000-8000-000000000002',
              courseCode: 'CS304',
              courseTitle: 'Database Management Systems',
              sectionName: 'Section B',
            },
          ],
        },
      };

      vi.spyOn(timetableApi, 'getFacultySchedule').mockResolvedValue(mockWeeklySchedule as any);

      const assignedCourses = await timetableApi.getFacultyAssignedCourses();

      expect(assignedCourses).toHaveLength(2);
      expect(assignedCourses[0].courseCode).toBe('CS302');
      expect(assignedCourses[0].courseOfferingId).toBe('b0000000-0000-4000-8000-000000000001');
      expect(assignedCourses[1].courseCode).toBe('CS304');
    });

    it('1.2 should retrieve enrolled course roster for roll call', async () => {
      const mockRoster = [
        {
          studentUserId: 's1',
          studentProfileId: 'sp1',
          rollNumber: '0251BTCS097',
          registrationNo: 'DBS25UG25234',
          fullName: 'Harendra Pratap Singh',
          currentAttendancePercent: 100,
        },
        {
          studentUserId: 's2',
          studentProfileId: 'sp2',
          rollNumber: '0251BTCS014',
          registrationNo: 'DBS25UG25014',
          fullName: 'Aman Deep Singh',
          currentAttendancePercent: 0,
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValue({
        success: true,
        data: mockRoster,
      } as any);

      const roster = await attendanceApi.getRoster('b0000000-0000-4000-8000-000000000001');

      expect(roster).toHaveLength(2);
      expect(roster[0].rollNumber).toBe('0251BTCS097');
      expect(roster[1].currentAttendancePercent).toBe(0);
    });
  });

  describe('2. Faculty Attendance Submission & Session Locking', () => {
    it('2.1 should create attendance session and submit batch records', async () => {
      const mockSession = {
        id: 'sess-uuid-101',
        courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
        facultyId: 'fac-1',
        sessionDate: '2026-10-20T10:00:00.000Z',
        startTime: '10:00 AM',
        topicTaught: 'Graph Algorithms: Bellman-Ford',
        isLocked: false,
      };

      const postSpy = vi.spyOn(apiClient, 'post')
        .mockResolvedValueOnce({ success: true, data: mockSession } as any)
        .mockResolvedValueOnce({
          success: true,
          data: { sessionId: 'sess-uuid-101', recordsMarked: 2, isLocked: true },
        } as any);

      const session = await attendanceApi.createSession({
        courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
        startTime: '10:00 AM',
        topicTaught: 'Graph Algorithms: Bellman-Ford',
      });

      expect(session.id).toBe('sess-uuid-101');

      const batchResult = await attendanceApi.recordBatch(
        session.id,
        [
          { studentId: 's1', status: 'PRESENT' },
          { studentId: 's2', status: 'ON_DUTY' },
        ],
        true
      );

      expect(batchResult.recordsMarked).toBe(2);
      expect(batchResult.isLocked).toBe(true);
      expect(postSpy).toHaveBeenCalledTimes(2);
    });

    it('2.2 should handle 409 Conflict when attempting to modify locked sessions', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValue(
        new ApiError('Attendance session is permanently locked against modifications', 409)
      );

      await expect(
        attendanceApi.recordBatch('sess-locked-999', [{ studentId: 's1', status: 'PRESENT' }], true)
      ).rejects.toThrow(ApiError);

      try {
        await attendanceApi.recordBatch('sess-locked-999', [{ studentId: 's1', status: 'PRESENT' }], true);
      } catch (err: any) {
        expect(err.statusCode).toBe(409);
        expect(err.message).toContain('locked');
      }
    });

    it('2.3 should retrieve defaulters report (< 75%) for an authorized course', async () => {
      const mockDefaulters = [
        {
          studentUserId: 's2',
          rollNumber: '0251BTCS014',
          fullName: 'Aman Deep Singh',
          attended: 0,
          conducted: 4,
          percentage: 0,
          status: 'danger',
          isDebarred: true,
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValue({
        success: true,
        data: mockDefaulters,
      } as any);

      const defaulters = await attendanceApi.getDefaulters('b0000000-0000-4000-8000-000000000001', 75.0);

      expect(defaulters).toHaveLength(1);
      expect(defaulters[0].isDebarred).toBe(true);
      expect(defaulters[0].percentage).toBe(0);
    });
  });

  describe('3. Faculty Assignment Management & Grading', () => {
    it('3.1 should list faculty course assignments and student submissions', async () => {
      const mockAssignments = [
        {
          id: 'asg-1',
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          courseCode: 'CS302',
          courseTitle: 'Design & Analysis of Algorithms',
          title: 'Problem Set 4: Bellman-Ford',
          dueDate: '2026-10-25T23:59:00.000Z',
          totalMarks: 50,
          isPublished: true,
          totalSubmissions: 1,
          gradedSubmissions: 0,
          pendingReviewCount: 1,
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValue({
        status: 'success',
        data: mockAssignments,
      } as any);

      const assignments = await assignmentApi.getFacultyAssignments('b0000000-0000-4000-8000-000000000001');

      expect(assignments).toHaveLength(1);
      expect(assignments[0].title).toBe('Problem Set 4: Bellman-Ford');
      expect(assignments[0].pendingReviewCount).toBe(1);
    });

    it('3.2 should submit evaluation score and feedback for a student submission', async () => {
      const mockGraded = {
        id: 'sub-1',
        assignmentId: 'asg-1',
        studentId: 's1',
        score: 48,
        feedback: 'Excellent dynamic programming implementation and complexity analysis.',
        status: 'GRADED',
        gradedAt: '2026-10-20T18:00:00.000Z',
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue({
        status: 'success',
        data: mockGraded,
      } as any);

      const graded = await assignmentApi.gradeSubmission('asg-1', 'sub-1', {
        score: 48,
        feedback: 'Excellent dynamic programming implementation and complexity analysis.',
      });

      expect(graded.score).toBe(48);
      expect(graded.status).toBe('GRADED');
      expect(graded.feedback).toContain('Excellent dynamic programming');
    });
  });

  describe('4. Faculty Leave / OD Approval Queue', () => {
    it('4.1 should retrieve pending leave and on-duty applications', async () => {
      const mockApplications = [
        {
          id: 'leave-1',
          studentId: 's1',
          studentName: 'Harendra Pratap Singh',
          studentRollNumber: '0251BTCS097',
          category: 'ON_DUTY',
          leaveType: 'CONFERENCE_ATTENDANCE',
          title: 'ACM ICPC Regional Contest Participation',
          startDate: '2026-10-22',
          endDate: '2026-10-24',
          totalDays: 3,
          reason: 'Representing DBS Global University at national programming regional finals.',
          status: 'PENDING',
          hasSupportingDocument: true,
          createdAt: '2026-10-20T11:00:00.000Z',
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValue({
        status: 'success',
        count: 1,
        data: mockApplications,
        pagination: { page: 1, limit: 50, totalCount: 1, totalPages: 1 },
      } as any);

      const res = await getPendingApprovals({ category: 'ON_DUTY' });

      expect(res.data).toHaveLength(1);
      expect(res.data[0].title).toContain('ACM ICPC');
      expect(res.data[0].category).toBe('ON_DUTY');
    });

    it('4.2 should record faculty approval decision with remarks', async () => {
      const mockApproved = {
        id: 'leave-1',
        status: 'APPROVED',
        decisionReason: 'Verified institutional invitation from ACM chapter. Approved with OD status.',
        approvedBy: 'fac-1',
      };

      vi.spyOn(apiClient, 'post').mockResolvedValue({
        status: 'success',
        data: mockApproved,
        message: 'Leave application successfully approved.',
      } as any);

      const res = await decideApplication('leave-1', {
        action: 'APPROVE',
        reason: 'Verified institutional invitation from ACM chapter. Approved with OD status.',
      });

      expect(res.data.status).toBe('APPROVED');
      expect(res.data.decisionReason).toContain('Verified institutional invitation');
    });
  });

  describe('5. RBAC & Security Boundary Enforcement', () => {
    it('5.1 should reject student attempts to create attendance sessions with 403 Forbidden', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValue(
        new ApiError('Access denied: Role STUDENT lacks FACULTY authorization', 403)
      );

      await expect(
        attendanceApi.createSession({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          startTime: '10:00 AM',
        })
      ).rejects.toThrow(ApiError);

      try {
        await attendanceApi.createSession({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          startTime: '10:00 AM',
        });
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.isForbidden).toBe(true);
      }
    });

    it('5.2 should reject student attempts to grade assignments with 403 Forbidden', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValue(
        new ApiError('Access denied: Students are not authorized to grade assignments', 403)
      );

      await expect(
        assignmentApi.gradeSubmission('asg-1', 'sub-1', { score: 50 })
      ).rejects.toThrow(ApiError);

      try {
        await assignmentApi.gradeSubmission('asg-1', 'sub-1', { score: 50 });
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.isForbidden).toBe(true);
      }
    });
  });
});
