# CAMU-NEXT — FRONTEND–BACKEND INTEGRATION AUDIT

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-20  
**Target Environment:** DBS Global University Student Portal (Camu-Next)  
**System Scope:** React 19 Frontend (`src/`) to Express 5 / PostgreSQL Backend (`server/src/routes/`)

---

## 1. Executive Summary

This audit establishes the baseline connectivity between the Camu-Next frontend and backend before executing Phase 15. The backend possesses a complete, hardened set of 12 domain REST API routers backed by PostgreSQL with triggers, row-level locking, and role-based access control.

However, the frontend presentation layer contains a mixture of:
1. **Fully Integrated Components:** Pages that already invoke backend APIs (e.g., `NoticeBoardView.tsx`, `StudentProfileView.tsx`, `FeeReceiptsView.tsx`, `StudentSupportView.tsx`, `LMSAssignments.tsx`, `GradebookView.tsx`).
2. **Partially Integrated Components with Silent Mock Fallbacks:** Pages where an API call exists in a try/catch block, but failures or initial states silently fall back to mock data structures (e.g., `SmartTimetable.tsx` falling back to `WEEKLY_SCHEDULE`).
3. **Hardcoded Mock-Driven Components:** The primary landing view (`StudentDashboard.tsx` when `activeTab === 'dashboard'`), which displays static numbers ("2,635 Students", "29 Teachers", "60 Faculty", "62% Academy Growth", "94.6% Success Rate") and hardcoded mock arrays (`monthlyAttendanceData`, `topTeachers`, `upcomingEvents`, `CURRENT_STUDENT`).
4. **Unsupported Mock-Only Components:** Standalone mock modules with no corresponding backend endpoints (e.g., `HostelGatePassView.tsx` utilizing `MOCK_GATE_PASSES`).
5. **API Client Inconsistencies:** `src/api/client.ts` defaults to `http://localhost:8000/api` (bypassing the Vite development proxy), stores `dbs_auth_token` in `localStorage`, and exhibits divergent response unwrapping patterns (`res.data` vs `{ success, data }` vs `{ status, data }`).

---

## 2. Feature & Page Inventory

| # | Feature / Page Component | Route / View Trigger | Current State | Mock Data Sources | Target Backend Endpoint(s) | Role Allowed |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Portal Gateway / Choice** | `/` (root domain) | Static UI | None | Public gateway selector | Public |
| **2** | **Student Login** | `/student` (unauthenticated) | Integrated | None | `POST /api/auth/login` | Public |
| **3** | **Teacher / Staff Login** | `/teacher` (unauthenticated) | Integrated | None | `POST /api/auth/login` | Public |
| **4** | **Student Dashboard (Overview)** | `activeTab === 'dashboard'` | **MOCK DRIVEN** | `CURRENT_STUDENT`, `monthlyAttendanceData`, `topTeachers`, `upcomingEvents` | `GET /api/profile/me`<br>`GET /api/attendance/my-summary`<br>`GET /api/timetable/student`<br>`GET /api/assignments/student`<br>`GET /api/notices`<br>`GET /api/calendar/events`<br>`GET /api/notifications` | `STUDENT` |
| **5** | **Smart Timetable** | `activeTab === 'timetable'` | **PARTIAL (Fallback)** | `WEEKLY_SCHEDULE`, `TODAY_CLASSES` | `GET /api/timetable/student` | `STUDENT` |
| **6** | **Academic Gradebook** | `activeTab === 'grades'` | **INTEGRATED** | None (uses API) | `GET /api/profile/academic-records` | `STUDENT` |
| **7** | **Fee Receipts & Ledger** | `activeTab === 'fees'` | **INTEGRATED** | None (uses API) | `GET /api/finance/student/ledger`<br>`GET /api/finance/student/transactions`<br>`GET /api/finance/student/receipts/:id` | `STUDENT` |
| **8** | **Hostel Gatepass** | `activeTab === 'gatepass'` | **MOCK ONLY** | `MOCK_GATE_PASSES` | *No backend endpoint exists* (client-side demo state) | `STUDENT` |
| **9** | **Leave & On-Duty (OD)** | `activeTab === 'leaves'` | **INTEGRATED** | None (uses API) | `GET /api/leave-od/applications`<br>`POST /api/leave-od/applications`<br>`POST /api/leave-od/applications/:id/cancel` | `STUDENT` |
| **10**| **LMS Assignments** | `activeTab === 'lms'` | **INTEGRATED** | None (uses API) | `GET /api/assignments/student`<br>`POST /api/assignments/:id/submit`<br>`GET /api/assignments/:id/submission/file` | `STUDENT` |
| **11**| **Notice Board** | `activeTab === 'notices'` | **INTEGRATED** | None (uses API) | `GET /api/notices`<br>`GET /api/notices/:id` | `STUDENT`, `FACULTY`, `REGISTRAR_ADMIN` |
| **12**| **Student Profile & Records**| `activeTab === 'profile'` | **INTEGRATED** | None (uses API) | `GET /api/profile/me`<br>`PATCH /api/profile/me`<br>`GET /api/profile/audit-trail` | `STUDENT` |
| **13**| **Student Support & Helpdesk**| `activeTab === 'support'` | **INTEGRATED** | None (uses API) | `GET /api/support/tickets`<br>`GET /api/support/tickets/:id`<br>`POST /api/support/tickets`<br>`POST /api/support/tickets/:id/messages` | `STUDENT` |
| **14**| **Notification Center** | Header Bell Dropdown | **INTEGRATED** | None (uses API) | `GET /api/notifications`<br>`GET /api/notifications/unread-count`<br>`PATCH /api/notifications/:id/read` | Authenticated |

---

## 3. Backend Endpoint & Contract Mapping Matrix

| Backend Domain | Method & Path | Auth Required | Role Allowed | Request Schema / Payload | Response Schema Shape |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Auth** | `POST /api/auth/login` | No | Any | `{ identifier: string, password: string, expectedRole?: string }` | `{ success: true, data: { user: SafeUser, token: string } }` (Sets `dbs_session` HTTP-only cookie) |
| **Auth** | `GET /api/auth/me` | Cookie | Any | *None* | `{ success: true, data: { user: SafeUser } }` |
| **Auth** | `POST /api/auth/logout` | Cookie | Any | *None* | `{ success: true, message: string }` |
| **Profile** | `GET /api/profile/me` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: StudentProfileDTO }` |
| **Profile** | `PATCH /api/profile/me` | Cookie | `STUDENT` | `{ phone?, personalEmail?, bloodGroup?, emergencyContact?, guardianName?, addressLine?, city?, state?, pincode? }` | `{ status: 'success', message: string, data: StudentProfileDTO }` |
| **Profile** | `GET /api/profile/academic-records` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: AcademicRecordsDTO }` |
| **Attendance** | `GET /api/attendance/my-summary` | Cookie | `STUDENT` | *None* | `{ success: true, data: OverallAttendanceSummary }` |
| **Timetable** | `GET /api/timetable/student` | Cookie | `STUDENT` | Query: `?day=Monday&academicYear=2026-2027&semester=3` | `{ status: 'success', data: DailyScheduleDTO \| WeeklyScheduleDTO }` |
| **Assignments**| `GET /api/assignments/student` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: StudentAssignmentItemDTO[] }` |
| **Assignments**| `POST /api/assignments/:id/submit` | Cookie | `STUDENT` | `{ submissionText?: string, fileName?: string, fileData?: string }` | `{ status: 'success', data: SubmissionDetailsDTO }` |
| **Assignments**| `GET /api/assignments/:id/submission/file` | Cookie | `STUDENT` | *None* | Binary stream (`application/pdf`) |
| **Finance** | `GET /api/finance/student/ledger` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: StudentFeeLedgerDTO }` |
| **Finance** | `GET /api/finance/student/invoices` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: FeeInvoiceDTO[] }` |
| **Finance** | `GET /api/finance/student/transactions` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: FeeTransactionDTO[] }` |
| **Finance** | `GET /api/finance/student/receipts/:id` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: PaymentReceiptDTO }` |
| **Finance** | `GET /api/finance/receipts/:id/verify` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: ReceiptVerificationResultDTO }` |
| **Leave/OD** | `GET /api/leave-od/applications` | Cookie | `STUDENT` | Query: `?status=...&category=...` | `{ status: 'success', count: number, data: LeaveApplicationDTO[] }` |
| **Leave/OD** | `POST /api/leave-od/applications` | Cookie | `STUDENT` | `{ category, leaveType, title, startDate, endDate, reason, fileName?, fileData? }` | `{ status: 'success', data: LeaveApplicationDTO }` |
| **Leave/OD** | `POST /api/leave-od/applications/:id/cancel` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: LeaveApplicationDTO }` |
| **Notices** | `GET /api/notices` | Cookie | Any | Query: `?category=...&priority=...&search=...` | `{ status: 'success', count: number, unreadCount: number, data: NoticeDTO[] }` |
| **Notices** | `GET /api/notices/:id` | Cookie | Any | *None* | `{ status: 'success', data: NoticeDTO }` |
| **Calendar** | `GET /api/calendar/events` | Cookie | Any | Query: `?startDate=2026-10-01&endDate=2026-10-31` | `{ status: 'success', count: number, data: CalendarEventDTO[] }` |
| **Support** | `GET /api/support/tickets` | Cookie | `STUDENT` | Query: `?status=...&category=...` | `{ status: 'success', count: number, data: SupportTicketDTO[] }` |
| **Support** | `GET /api/support/tickets/:id` | Cookie | `STUDENT` | *None* | `{ status: 'success', data: TicketDetailDTO }` (Internal notes suppressed) |
| **Support** | `POST /api/support/tickets` | Cookie | `STUDENT` | `{ category, priority, subject, description }` | `{ status: 'success', data: SupportTicketDTO }` |
| **Support** | `POST /api/support/tickets/:id/messages` | Cookie | `STUDENT` | `{ message: string }` | `{ status: 'success', data: TicketMessageDTO }` |
| **Notifications**| `GET /api/notifications` | Cookie | Any | *None* | `{ status: 'success', count: number, unreadCount: number, data: NotificationDTO[] }` |
| **Notifications**| `GET /api/notifications/unread-count` | Cookie | Any | *None* | `{ status: 'success', data: { unreadCount: number } }` |
| **Notifications**| `PATCH /api/notifications/:id/read` | Cookie | Any | *None* | `{ status: 'success', data: NotificationDTO }` |

---

## 4. Mock Data Locations & Replacement Audit

### 4.1 `src/data/mockData.ts`
The entire file contains:
- `CURRENT_STUDENT`: Mock student profile (`Harendra Pratap Singh`, `0251BTCS097`, `8.64 CGPA`). Used in `StudentDashboard.tsx`, `Navbar.tsx`, `HostelGatePassView.tsx`.
- `ATTENDANCE_DATA`: 6 mock subject attendance rows.
- `TODAY_CLASSES`: 4 mock timetable classes for Monday.
- `WEEKLY_SCHEDULE`: Hardcoded Monday–Saturday timetable classes in `SmartTimetable.tsx`.
- `MOCK_LEAVES`: 4 mock leave entries.
- `MOCK_ASSIGNMENTS`: 5 mock assignment entries.
- `MOCK_NOTICES`: 4 mock campus notices.
- `MOCK_FEE_INVOICES`: Mock invoices and receipt numbers.
- `MOCK_EXAM_GRADES`: Mock semester grade rows.
- `MOCK_GATE_PASSES`: Mock gate pass entries (no backend service).
- `FACULTY_STUDENT_LIST`: Mock student roster for faculty attendance view.

### 4.2 `StudentDashboard.tsx` Hardcoded Mock Data
When `activeTab === 'dashboard'`:
1. **Hero Floating Stats:**
   - `2,635` Students (hardcoded)
   - `29` Teachers (hardcoded)
   - `60` Faculty (hardcoded)
2. **Column 1 (Left):**
   - Growth widget: `62%` circular gauge (hardcoded)
   - "12 Days left" anniversary banner (hardcoded)
3. **Column 2 (Center):**
   - `monthlyAttendanceData`: Hardcoded 6-month array (`[ { month: 'Oct', percent: 84 }, ... ]`)
   - `topTeachers`: Hardcoded array of 3 professors (`Dr. Rajesh Sharma`, `Prof. Meenakshi Joshi`, `Dr. Sunita Negi`)
   - `Success Rate`: Hardcoded `94.6%`
4. **Column 3 (Right):**
   - `upcomingEvents`: Hardcoded array (`Mid-Term Exams`, `Annual Sports Fest`, `DSA Workshop`)
5. **Floating Bar Modals:**
   - Profile modal: Hardcoded references to `CURRENT_STUDENT` fields.
   - Attendance modal: Contains live call `attendanceApi.getMySummary()`, but needs direct loading state.
   - Exams / Transcripts modal: Hardcoded exam tables.

---

## 5. Architectural & Contract Discrepancies Identified

1. **Vite Development Proxy Bypass:**
   - In `src/api/client.ts`, `API_BASE_URL` is configured as:
     `const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';`
   - Because `http://localhost:8000/api` is an absolute cross-origin URL, browser requests from `http://localhost:5173` bypass Vite's local `/api` proxy. This causes cross-origin cookie restrictions and CORS preflight overhead.
   - **Resolution:** Change base URL to `/api` by default (`import.meta.env.VITE_API_URL || '/api'`), letting Vite proxy `/api` to `http://localhost:8000` in development and allowing Nginx/ALB reverse proxy to handle `/api` same-origin in production.

2. **Session Storage Invariant Violation:**
   - `src/api/auth.ts` lines 55-60 stores `localStorage.setItem('dbs_auth_token', session.token)`.
   - The backend uses HTTP-only `dbs_session` cookies. Storing tokens in `localStorage` violates modern token security principles and Phase 15 constraints.
   - **Resolution:** Remove `dbs_auth_token` from `localStorage`. Rely exclusively on HTTP-only session cookies sent automatically via `credentials: 'include'`. Only cache non-sensitive user identity (`dbs_user_session`) for fast UI hydration.

3. **Inconsistent Response Unwrapping:**
   - Some backend endpoints return `{ success: true, data: ... }` (e.g. Auth, Attendance).
   - Other backend endpoints return `{ status: 'success', data: ... }` (e.g. Profile, Finance, Timetable, Notices, Leave, Support).
   - `client.ts` currently types `ApiResponse<T>` with `{ success: boolean, data: T }`, causing TypeScript and runtime friction when unwrapping `{ status: 'success', data: T }`.
   - **Resolution:** Standardize `ApiResponse<T>` to accept `{ success?: boolean; status?: string; data: T; message?: string }` and normalize unwrapping.

4. **Silent Mock Fallbacks in `SmartTimetable.tsx`:**
   - In `SmartTimetable.tsx`, `scheduleData` is initialized with `WEEKLY_SCHEDULE`. If the API fails or is empty, it silently renders `WEEKLY_SCHEDULE`.
   - **Resolution:** Initialize with empty schedule; show skeleton loader during fetch; show real server schedule if available; display clear empty/unavailable state if no schedule is enrolled.

5. **`HostelGatePassView.tsx` Backend Gap:**
   - The backend has no Hostel Gatepass service or table.
   - **Resolution:** Clearly document as an unbacked module; display a clear non-production demonstration banner inside the view.

---

## 6. Implementation Plan & Execution Order

1. **Phase 2 — Shared API & Authentication Foundation:**
   - Consolidate `src/api/client.ts`: set base URL to `/api`, enforce `credentials: 'include'`, remove token from `localStorage`, handle errors & 401 dispatch cleanly.
   - Update `src/api/auth.ts` to rely on cookie session, stop writing auth tokens to storage, and add session restoration from `/api/auth/me`.
2. **Phase 3 — Real Student Dashboard:**
   - Refactor `src/components/StudentDashboard.tsx` to fetch real data on mount:
     - Profile & Identity: `getMyProfile()`
     - Attendance Summary: `attendanceApi.getMySummary()`
     - Today's Classes: `timetableApi.getStudentSchedule()`
     - Assignments: `assignmentApi.getStudentAssignments()`
     - Notices & Events: `getRecipientNotices()` & `calendarApi.getEvents()`
     - Unread Notifications: `getUnreadNotificationCount()`
     - Finance Overview: `financeApi.getStudentLedger()`
   - Add loading skeletons, retry handlers, and clean empty states for all dashboard cards.
   - Remove hardcoded numbers ("2,635", "29", "60", "62%", "94.6%") and replace with real student metrics.
3. **Phase 4 — Sub-view Integration Verification:**
   - Audit and test `SmartTimetable.tsx`, `LMSAssignments.tsx`, `NoticeBoardView.tsx`, `StudentProfileView.tsx`, `FeeReceiptsView.tsx`, `LeaveODManager.tsx`, `StudentSupportView.tsx`.
   - Ensure all sub-views handle live responses and error states gracefully without silent mock fallbacks.
4. **Phase 5 — Verification & Testing:**
   - Run typechecks, linting, and vitest suites.
   - Add automated integration tests verifying API client and dashboard data binding with real synthetic accounts.

---
*Audit completed by Antigravity Engineering Lead Architecture Team.*
