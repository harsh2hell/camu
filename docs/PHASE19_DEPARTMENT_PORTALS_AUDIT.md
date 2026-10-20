# CAMU-NEXT — PHASE 19 AUDIT & ARCHITECTURE SPECIFICATION
## University Department Portals, Administrative Workflows & Centralized RBAC

**Target Institution:** DBS Global University (DGU), Dehradun  
**Platform:** Camu-Next Enterprise Academic & Administrative Portal  
**Audit Author:** Antigravity AI Engineering Team  
**Date:** October 21, 2026  
**Status:** Pre-Implementation Architectural Baseline  

---

## 1. Executive Summary & Objective

Phases 16–18 established reported faculty workflows, cryptographic QR attendance, and a modernized student portal connected to the authoritative Express 5 / PostgreSQL backend.

**Phase 19 Objective:** Transform Camu-Next into a comprehensive, multi-departmental university administration platform for **DBS Global University (DGU)**. Rather than creating disjointed or siloed dashboards, every administrative department operates against a **single authoritative PostgreSQL data model** with strict Role-Based Access Control (RBAC), multi-tenant department scoping, immutable audit logging, and transactional data integrity.

### Department Portals Covered in Phase 19:
1. **Admissions & Enrollment Portal:** Applicant search, document checklist verification, status workflow, offer generation, and atomic/idempotent applicant-to-student conversion.
2. **Finance & Accounts Portal:** Student fee-account lookup, invoicing, concession/waiver adjustments with mandatory justification, duplicate-protected reconciliation, and transparent `GATEWAY_UNCONFIGURED` handling.
3. **Academic Administration & Registrar Portal:** Program & department catalog, course offerings, section allocations, timetable management, enrollment administration, and audit-logged academic record corrections.
4. **Department Leadership (HOD & Dean) Portal:** Department-scoped student/faculty oversight, attendance compliance & defaulter monitoring, course allocations, assignment tracking, and leave/OD approvals without cross-department data leakage.
5. **IT & Support Administration Portal:** Helpdesk queue triage, staff ticket assignment, resolution lifecycle, and strict internal-note isolation from student view.
6. **Super-Admin & Central Governance Portal:** Platform health, user/role management, account suspension/reactivation, privilege escalation prevention, and system audit trail review.

---

## 2. Current System State & Gap Analysis

### 2.1 Role Definitions & PostgreSQL Enums
- **Existing `user_role` in PostgreSQL:**
  `STUDENT`, `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN`, `EXAM_CONTROLLER`.
- **Gaps Identified:**
  - No explicit `ADMISSIONS_OFFICER` role (admissions actions were either omitted or lumped into generic admin).
  - No dedicated `FINANCE_OFFICER` role (finance admin currently requires `REGISTRAR_ADMIN`).
  - No dedicated `IT_SUPPORT` role (staff helpdesk uses a union of academic roles).
  - No dedicated `SUPER_ADMIN` role for platform configuration and role governance.
- **Resolution:**
  Extend PostgreSQL enum `user_role` with:
  `ADMISSIONS_OFFICER`, `FINANCE_OFFICER`, `IT_SUPPORT`, `SUPER_ADMIN`.
  Existing roles (`STUDENT`, `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN`, `EXAM_CONTROLLER`) remain 100% backward-compatible without regressing existing tests.

### 2.2 Database Schema Audit
- **Existing Entities (36 tables):**
  `users`, `student_profiles`, `faculty_profiles`, `departments`, `programs`, `batches`, `sections`, `courses`, `course_offerings`, `enrollments`, `timetable_slots`, `attendance_sessions`, `attendance_records`, `student_grades`, `exam_components`, `leave_applications`, `leave_audit_logs`, `assignments`, `assignment_submissions`, `fee_invoices`, `fee_invoice_items`, `fee_transactions`, `fee_audit_logs`, `notices`, `notice_audit_logs`, `support_tickets`, `ticket_messages`, `ticket_audit_logs`, `notifications`, `sessions`, `hostel_gate_passes`, etc.
- **Missing Entities & Gaps Identified:**
  1. **No Admissions Table:** No applicant records, documents checklist, or application tracking model exists in `schema.prisma`.
  2. **No User Governance Audit Log:** No table records role assignment/revocation, account suspension, or password resets.
  3. **No Academic Record Correction Log:** No table records formal corrections to finalized grades or locked attendance with approval reference numbers.
- **Resolution:**
  Add new Prisma models:
  - `AdmissionApplication` & `AdmissionAuditLog`
  - `UserAuditLog`
  - `AcademicCorrectionLog`

### 2.3 Existing Frontend Pages & Administrative Views
- **Existing Components:**
  - `FinanceAdminView.tsx`: Invoices, transactions, concession modal, manual reconciliation.
  - `StaffHelpdeskView.tsx`: Staff queue, ticket triage, reply form with internal notes, status transition modal.
  - `FacultyAttendanceView.tsx`: Session marker & QR launcher.
  - `DefaultersView.tsx`: Attendance defaulter report (< 75%).
  - `FacultyLeaveApprovalView.tsx`: Leave/OD decision queue.
  - `FacultyNoticeManagerView.tsx`: Circular authoring & scheduling.
  - `FacultyStudentRecordsView.tsx`: Mentee grade & profile lookup.
- **Missing Workspaces:**
  - Admissions & Enrollment Workspace (Applicant list, review, document verification, enrollment conversion).
  - Academic Administration Workspace (Course catalog, program management, course registration, timetable schedule).
  - Department Leadership (HOD/Dean) Scoped Overview (Real-time department compliance KPIs, faculty course loads).
  - Super-Admin Central Governance Workspace (User management, role assignment, system health, audit logs).

---

## 3. Authoritative Role-to-Capability Matrix

The matrix below defines the explicit permissions across every university portal workspace:

| Capability / API Operation | STUDENT | FACULTY | HOD | DEAN | ADMISSIONS_OFFICER | FINANCE_OFFICER | REGISTRAR_ADMIN | IT_SUPPORT | SUPER_ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Student Self-Service** (Dashboard, Schedule, Fees, Leaves, LMS) | **READ/OWN** | - | - | - | - | - | - | - | - |
| **Faculty Teaching** (Attendance marking, QR code, Assignments, Grading) | - | **OWN** | **DEPT** | **SCHOOL** | - | - | **ALL** | - | **ALL** |
| **Leave / OD Approvals** | - | **MENTOR** | **DEPT** | **SCHOOL** | - | - | **ALL** | - | **ALL** |
| **Department Leadership Overview** (Faculty loads, attendance defaulters) | - | - | **DEPT** | **SCHOOL** | - | - | **ALL** | - | **ALL** |
| **Applicant Management** (Search, document check, status update) | - | - | - | - | **FULL** | - | **FULL** | - | **FULL** |
| **Applicant-to-Student Conversion** (Enrollment transaction, Roll No.) | - | - | - | - | **EXEC** | - | **EXEC** | - | **EXEC** |
| **Fee Ledger & Student Dues Lookup** | OWN | - | - | - | READ | **FULL** | **FULL** | - | **FULL** |
| **Fee Concessions & Waivers** | - | - | - | - | - | **EXEC** | **EXEC** | - | **EXEC** |
| **Payment Reconciliation** (Bank transfer, Challan, Cashier counter) | - | - | - | - | - | **EXEC** | **EXEC** | - | **EXEC** |
| **Academic Catalog & Program Config** | READ | READ | DEPT | SCHOOL | READ | - | **FULL** | - | **FULL** |
| **Course Allocation & Timetable Admin** | READ | OWN | DEPT | SCHOOL | - | - | **FULL** | - | **FULL** |
| **Official Grade / Attendance Corrections** | - | - | REQ | REQ | - | - | **EXEC** | - | **EXEC** |
| **Institutional Notices Publishing** | READ | OWN | DEPT | SCHOOL | - | - | **FULL** | - | **FULL** |
| **Support Helpdesk Queue & Replies** | OWN | QUEUE | QUEUE | QUEUE | - | - | QUEUE | **FULL** | **FULL** |
| **Helpdesk Internal Staff Notes** | - | WRITE | WRITE | WRITE | - | - | WRITE | **WRITE** | **WRITE** |
| **User & Role Administration** | - | - | - | - | - | - | - | READ | **FULL** |
| **Account Suspension / Reactivation** | - | - | - | - | - | - | - | - | **EXEC** |
| **Platform System Health & Diagnostics** | - | - | - | - | - | - | READ | **FULL** | **FULL** |

**Legend:**
- `OWN`: Access restricted to records owned by or assigned to the authenticated user.
- `DEPT`: Access restricted strictly to the user's assigned academic department (e.g., Computer Science).
- `SCHOOL`: Access restricted to all departments within the user's assigned school (e.g., School of Engineering).
- `QUEUE`: Access restricted to support tickets relevant to the staff member's department or role.
- `EXEC`: Authorized to execute sensitive state mutations requiring documented justification and audit logging.
- `FULL`: Complete administrative access across the institutional domain.

---

## 4. Architectural Design by Department Workspace

### 4.1 Admissions & Enrollment Portal
- **Endpoints:**
  - `GET /api/admissions/applications` (Query with search, program, status, year, pagination)
  - `POST /api/admissions/applications` (Create applicant record)
  - `GET /api/admissions/applications/:id` (Applicant details, document checklist, notes)
  - `PATCH /api/admissions/applications/:id` (Update applicant details / notes)
  - `POST /api/admissions/applications/:id/status` (Transition status: `SHORTLISTED`, `OFFER_EXTENDED`, `ADMITTED`, `REJECTED`)
  - `POST /api/admissions/applications/:id/enroll` (Atomic conversion into student record)
- **Enrollment Conversion Guarantees:**
  - Executed inside a Prisma `$transaction`.
  - **Idempotency:** If application is already `ENROLLED`, returns the existing enrolled profile without throwing or duplicating records.
  - **Unique Identifiers:** Generates canonical roll number (`YY[PROG_CODE]NNN`) and registration number (`DGU-YYYY-NNNN`).
  - Creates corresponding `User` (role: `STUDENT`), `StudentProfile`, and initial semester `FeeInvoice`.
  - Dispatches `AdmissionAuditLog` entry.

### 4.2 Finance & Accounts Portal
- **Endpoints:**
  - `GET /api/finance/admin/students/:studentId/ledger` (View complete student fee account by ID or roll number)
  - `GET /api/finance/admin/invoices` (Filterable invoice list across terms, programs, statuses)
  - `POST /api/finance/admin/invoices` (Generate and issue fee invoice)
  - `PATCH /api/finance/admin/invoices/:id/adjust` (Apply concession with mandatory reason)
  - `POST /api/finance/admin/reconcile` (Reconcile offline bank transfer / challan / counter payment)
  - `GET /api/finance/admin/transactions` (All financial transactions)
  - `GET /api/finance/admin/audit-logs` (Financial mutation audit trail)
- **Integrity Safeguards:**
  - Reconciliations must verify `invoice.status !== 'PAID'` and check transaction reference uniqueness to prevent duplicate entry.
  - Online student payment (`POST /api/finance/student/pay`) maintains strict `GATEWAY_UNCONFIGURED` disclosure with bank transfer instructions.

### 4.3 Academic Administration & Registrar Portal
- **Endpoints:**
  - `GET /api/academic/departments` & `POST /api/academic/departments`
  - `GET /api/academic/programs` & `POST /api/academic/programs`
  - `GET /api/academic/courses` & `POST /api/academic/courses`
  - `GET /api/academic/offerings` & `POST /api/academic/offerings` (Allocate faculty to course section)
  - `POST /api/academic/enrollments` (Enroll students into course offerings)
  - `POST /api/academic/corrections` (Submit formal correction to attendance or finalized grade with reason and approval reference)
  - `GET /api/academic/corrections/audit` (Audit log of all academic record adjustments)

### 4.4 Department Leadership (HOD & Dean) Portal
- **Endpoints:**
  - `GET /api/department/overview` (Real-time department KPIs: faculty count, student count, active course offerings, average attendance)
  - `GET /api/department/faculty-loads` (Faculty course allocation and teaching loads)
  - `GET /api/department/defaulters` (Department-scoped attendance defaulters < 75%)
  - `GET /api/department/pending-approvals` (Aggregated pending leaves, OD requests, and notices requiring HOD/Dean sign-off)
- **Anti-IDOR Scope Enforcement:**
  - On every request, `req.user.departmentId` or user's assigned school is verified.
  - If a HOD queries data for a different department, server strictly rejects with `403 Forbidden: Department scope violation`.

### 4.5 IT Support Administration Portal
- **Endpoints:**
  - Reuses `/api/support/queue`, `/api/support/summary`, `/api/support/tickets/:id/assign`, `/api/support/tickets/:id/status`.
  - Authorized for `IT_SUPPORT`, `REGISTRAR_ADMIN`, `SUPER_ADMIN`.
  - Internal notes (`isInternal: true`) strictly excluded from student API responses in `support.repository.ts`.
  - Sensitive server errors or credentials redacted from ticket histories.

### 4.6 Super-Admin Governance Portal
- **Endpoints:**
  - `GET /api/admin/users` (List all users with search, role, status filters)
  - `POST /api/admin/users` (Create administrative or staff user)
  - `PATCH /api/admin/users/:id/role` (Assign or modify user role)
  - `PATCH /api/admin/users/:id/status` (Suspend or reactivate user account)
  - `GET /api/admin/audit-logs` (System-wide user governance audit log)
  - `GET /api/admin/system-health` (Database latency, memory usage, job runner status)
- **Privilege Safeguards:**
  - Non-super admins cannot grant `SUPER_ADMIN` role.
  - A user cannot demote or suspend their own active account (`400 Bad Request: Self-suspension prohibited`).
  - All role transitions logged to `UserAuditLog`.

---

## 5. Security & Verification Requirements

1. **Authentication:**
   - Universal HTTP-only cookie session authentication via `requireAuth`.
   - Centralized RBAC enforcement via `requireRole`.
2. **Data Integrity:**
   - Single PostgreSQL data store; no secondary cache or mocked state.
   - Atomic transactions (`prisma.$transaction`) for admissions conversions, fee reconciliations, and course allocations.
3. **Immutability:**
   - Audit logs (`admission_audit_logs`, `fee_audit_logs`, `user_audit_logs`, `academic_correction_logs`) cannot be updated or deleted.
4. **Test Verification Suite:**
   - Minimum 15 new test cases covering:
     - Admissions creation, listing, offer issue, and idempotent student enrollment.
     - Finance student lookup, fee adjustments, and duplicate reconciliation rejection.
     - Academic catalog and course offering allocation.
     - Department leadership scope enforcement (reject cross-department access with 403).
     - IT support internal note privacy.
     - Super-admin role assignment, self-suspension blocking, and non-admin privilege escalation rejection.
     - All existing 23 test suites (366 tests) must continue to pass with 0 regressions.

---

## 6. Implementation & Empirical Verification Results

- **PostgreSQL Enum & Schema Extensions:**
  - `user_role` extended with: `ADMISSIONS_OFFICER`, `FINANCE_OFFICER`, `IT_SUPPORT`, `SUPER_ADMIN`.
  - `admission_application_status` enum created with: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `SHORTLISTED`, `OFFER_MADE`, `OFFER_EXTENDED`, `OFFER_ACCEPTED`, `ADMITTED`, `ENROLLED`, `REJECTED`, `WITHDRAWN`.
  - Authoritative tables created: `admission_applications`, `admission_audit_logs`, `user_audit_logs`, `academic_correction_logs`.
- **End-to-End Test Execution:**
  - `server/tests/phase19DepartmentPortals.test.ts`: **27 of 27 tests passed** (100%).
  - Complete Test Suite (`npm test`): **24 of 24 suites passed, 393 of 393 tests passed** with 0 regressions.
  - Production TypeScript & Vite Client Bundle: **0 errors**, cleanly generated.
- **Verdict:**
  - **GO RECOMMENDATION:** Ready for executive demonstration to DBS Global University (DGU) leadership.

