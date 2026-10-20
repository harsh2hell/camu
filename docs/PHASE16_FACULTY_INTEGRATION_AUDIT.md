# CAMU-NEXT — PHASE 16: FACULTY PORTAL INTEGRATION AUDIT

**Document Version:** 1.0.0  
**Audit Date:** October 20, 2026  
**Auditor / Architecture Lead:** Antigravity Advanced Agentic Engineering Team  
**Scope:** Faculty Portal (`currentRole === 'FACULTY'`) React 19 Frontend Components to Express 5 / PostgreSQL Backend

---

## 1. Executive Summary

Following the completion of Phase 15 (Student Dashboard & API client consolidation), Phase 16 focuses on integrating the faculty administration portal.

While the backend has a rich suite of RBAC-enforced services for course management, attendance marking, assignment grading, and leave approvals, several faculty frontend views retained hardcoded course offering IDs (`b0000000-0000-4000-8000-000000000001`), static mock rosters (`FACULTY_STUDENT_LIST`), or mock fallback blocks.

This audit establishes the exact backend endpoints, HTTP methods, authorization requirements, and data shapes required to make every faculty workflow authentic, database-persisted, and resilient without compromising server security.

---

## 2. Faculty Workflow & Endpoint Mapping Matrix

| Workflow Domain | Frontend Component | Action / Operation | Backend Endpoint | Method | RBAC Roles | Request Payload | Response Contract Shape |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **Auth** | `TeacherLoginPage.tsx` | Faculty Sign-in | `/api/auth/login` | `POST` | Public | `{ identifier, password, expectedRole: 'FACULTY' }` | `{ success: true, data: { user, token } }` (Sets `dbs_session` HTTP-only cookie) |
| **Auth** | `Navbar.tsx` | Session Verification | `/api/auth/me` | `GET` | Authenticated | *None* | `{ success: true, data: { user } }` |
| **Timetable** | `FacultyAttendanceView.tsx` | Load Assigned Courses | `/api/timetable/faculty` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | *Optional query* (`day`, `academicYear`, `semester`) | `{ status: 'success', data: { academicYear, semester, schedule, totalWeeklySlots } }` |
| **Attendance** | `FacultyAttendanceView.tsx` | Load Course Roster | `/api/attendance/roster` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Query: `?offeringId=<uuid>` | `{ success: true, data: EnrolledStudentDTO[] }` |
| **Attendance** | `FacultyAttendanceView.tsx` | Create Lecture Session | `/api/attendance/sessions` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ courseOfferingId, startTime, topicTaught?, sessionDate? }` | `{ success: true, data: AttendanceSessionDTO }` (Status 201) |
| **Attendance** | `FacultyAttendanceView.tsx` | Record Attendance Batch | `/api/attendance/sessions/:id/records` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ records: [{ studentId, status }], lockSession: boolean }` | `{ success: true, data: { sessionId, recordsMarked, isLocked } }` |
| **Attendance** | `DefaultersView.tsx` | Defaulters Report (<75%) | `/api/attendance/defaulters` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Query: `?offeringId=<uuid>&threshold=75` | `{ success: true, data: DefaulterStudentDTO[] }` |
| **Assignments**| `FacultyAssignmentsView.tsx` | List Course Assignments | `/api/assignments/faculty` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Query: `?courseOfferingId=<uuid>` | `{ status: 'success', count: number, data: FacultyAssignmentItemDTO[] }` |
| **Assignments**| `FacultyAssignmentsView.tsx` | Create Assignment | `/api/assignments` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ courseOfferingId, title, description?, attachmentUrl?, dueDate, totalMarks?, isPublished? }` | `{ status: 'success', data: AssignmentDTO }` (Status 201) |
| **Assignments**| `FacultyAssignmentsView.tsx` | Update Assignment | `/api/assignments/:id` | `PUT` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ title?, description?, attachmentUrl?, dueDate?, totalMarks?, isPublished? }` | `{ status: 'success', data: AssignmentDTO }` |
| **Assignments**| `FacultyAssignmentsView.tsx` | List Submissions | `/api/assignments/:id/submissions` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | *None* | `{ status: 'success', count: number, data: SubmissionDetailsDTO[] }` |
| **Assignments**| `FacultyAssignmentsView.tsx` | Grade Submission | `/api/assignments/:id/submissions/:submissionId/grade` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ score: number, feedback?: string }` | `{ status: 'success', data: GradedSubmissionDTO }` |
| **Assignments**| `FacultyAssignmentsView.tsx` | Download Student File | `/api/assignments/:id/submissions/:submissionId/file` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | *None* | Binary stream (`application/pdf`, etc.) |
| **Leave/OD** | `FacultyLeaveApprovalView.tsx` | Pending Approvals Queue | `/api/leave-od/approvals/pending` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Query: `?category=...&page=1&limit=50` | `{ status: 'success', count: number, data: LeaveApplicationDTO[], pagination }` |
| **Leave/OD** | `FacultyLeaveApprovalView.tsx` | Decision History | `/api/leave-od/approvals/history` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Query: `?status=...&category=...` | `{ status: 'success', count: number, data: LeaveApplicationDTO[], pagination }` |
| **Leave/OD** | `FacultyLeaveApprovalView.tsx` | Submit Decision | `/api/leave-od/approvals/:id/decide` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ action: 'APPROVE' \| 'REJECT' \| 'REQUEST_CORRECTION', reason? }` | `{ status: 'success', data: LeaveApplicationDTO }` |
| **Leave/OD** | `FacultyLeaveApprovalView.tsx` | Supporting Doc Download | `/api/leave-od/applications/:id/document` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | *None* | Binary stream (`application/pdf`, image) |
| **Mentorship** | `FacultyStudentRecordsView.tsx`| Assigned Mentees | `/api/profile/mentees` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | *None* | `{ success: true, count: number, data: StudentProfileDTO[] }` |
| **Mentorship** | `FacultyStudentRecordsView.tsx`| Student Academic Record | `/api/profile/students/:studentId/academic-records` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | *None* | `{ status: 'success', data: AcademicRecordsDTO }` |
| **Notices** | `FacultyNoticeManagerView.tsx` | Management Feed | `/api/notices/manage` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Query: `?status=...&search=...` | `{ status: 'success', count: number, data: NoticeDTO[] }` |
| **Notices** | `FacultyNoticeManagerView.tsx` | Create Notice | `/api/notices` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ title, content, category, priority, isPinned, targetRole, targetSemester, publicationMode, publishAt?, expiresAt? }` | `{ status: 'success', data: NoticeDTO }` |
| **Notices** | `FacultyNoticeManagerView.tsx` | Publish Notice | `/api/notices/:id/publish` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | *None* | `{ status: 'success', data: NoticeDTO }` |
| **Notices** | `FacultyNoticeManagerView.tsx` | Archive Notice | `/api/notices/:id/archive` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | *None* | `{ status: 'success', data: NoticeDTO }` |
| **Notices** | `FacultyNoticeManagerView.tsx` | Cancel Notice | `/api/notices/:id/cancel` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ reason: string }` | `{ status: 'success', data: NoticeDTO }` |
| **Helpdesk** | `StaffHelpdeskView.tsx` | Queue Summary | `/api/support/summary` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | *None* | `{ success: true, data: TicketQueueSummaryDTO }` |
| **Helpdesk** | `StaffHelpdeskView.tsx` | Staff Support Queue | `/api/support/queue` | `GET` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Query: `?status=...&category=...&assignedToMe=...` | `{ success: true, data: { tickets: SupportTicketDTO[], total: number } }` |
| **Helpdesk** | `StaffHelpdeskView.tsx` | Reply / Internal Note | `/api/support/tickets/:ticketId/messages` | `POST` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ message: string, isInternalNote?: boolean }` | `{ success: true, data: TicketMessageDTO }` |
| **Helpdesk** | `StaffHelpdeskView.tsx` | Update Ticket Status | `/api/support/tickets/:ticketId/status` | `PATCH` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | `{ status: TicketStatus, reason?, resolutionNotes? }` | `{ success: true, data: SupportTicketDTO }` |

---

## 3. Inventory of Frontend Mock Fallbacks & Blockers

1. **`FacultyAttendanceView.tsx`:**
   - **Initial State:** Initialized with `FACULTY_STUDENT_LIST` from `mockData.ts`. If the API fails, it catches the error and silently keeps the mock list.
   - **Hardcoded Course Offering ID:** `b0000000-0000-4000-8000-000000000001` is hardcoded. It does not allow switching between different courses assigned to the faculty member.
   - **Remediation:**
     - Initialize `students` to empty array `[]`.
     - Dynamically fetch the faculty member's assigned courses from `GET /api/timetable/faculty`.
     - Provide a course offering selector dropdown for the faculty's assigned courses.
     - Fetch the real student roster from `GET /api/attendance/roster?offeringId=<selectedOfferingId>`.
     - Present clear loading spinner, empty roster state, and actionable error retry UI without silent mock fallbacks.
     - Prevent duplicate submissions and provide actionable messaging on 409 Conflict (e.g. locked sessions).

2. **`DefaultersView.tsx`:**
   - **Initial State & Catch Block:** Falls back to `FACULTY_STUDENT_LIST.filter(s => s.currentAttendance < 75)` if API fails.
   - **Remediation:**
     - Remove `FACULTY_STUDENT_LIST` import and fallback block.
     - Dynamically fetch assigned courses and allow filtering by authorized offering.
     - Present empty state ("No attendance defaulters in this course offering - 100% compliance") and retry UI.
     - Clearly label the "Send Warning" button as portal/notification dispatch rather than fake SMS.

3. **`FacultyAssignmentsView.tsx`:**
   - **Hardcoded Course Offering ID in Create Form:** Defaulted to hardcoded `b0000000-0000-4000-8000-000000000001`.
   - **Remediation:** Populate course offering options from authenticated faculty member's active course assignments.
   - **File Download URL:** Update `resolveFileUrl` in `src/api/assignment.ts` to default to `/api` or window origin instead of hardcoding `http://localhost:8000/api`.

4. **`FacultyLeaveApprovalView.tsx`:**
   - The view already invokes `getPendingApprovals` and `decideApplication`.
   - **Remediation:** Ensure document download links use the relative API client and verify error handling for concurrent decisions or invalid state transitions (409 / 400).

5. **`StaffHelpdeskView.tsx` & `FacultyNoticeManagerView.tsx`:**
   - Both views already invoke real backend controllers. Verify that no mock fallback catches hide backend issues.

---

## 4. Execution Plan

1. **Step 1 (Priority 1): Faculty Attendance Workflow:**
   - Add `getFacultyCourses()` helper to derive assigned courses from `/api/timetable/faculty`.
   - Refactor `FacultyAttendanceView.tsx`: remove `FACULTY_STUDENT_LIST`, support dynamic course selection, real roster loading, session creation, batch record submission, and locked-session handling.
   - Refactor `DefaultersView.tsx`: remove mock fallback, bind to live course selection and defaulter API.
2. **Step 2 (Priority 2): Assignment Management & Grading:**
   - Refactor `FacultyAssignmentsView.tsx`: populate course offering dropdown from live assignments/schedule, ensure submissions list and grading work end-to-end with student-side visibility.
   - Refactor `src/api/assignment.ts` download URL resolution.
3. **Step 3 (Priority 3): Leave & OD Approval Queue:**
   - Verify and harden `FacultyLeaveApprovalView.tsx`: ensure live approvals, rejection reasons, audit trail modal, and document download work cleanly.
4. **Step 4: End-to-End Verification & Automated Tests:**
   - Author integration tests for faculty workflows in `tests/faculty.test.ts`.
   - Verify cross-user isolation (students cannot create attendance sessions or grade assignments).
   - Execute test suites and document results in `phase16_faculty_integration_report.md`.
