# CAMU-NEXT — PHASE 17: SECURE QR-BASED ATTENDANCE AUDIT & TECHNICAL SPECIFICATION

**Document Version:** 1.0.0  
**Phase:** 17 — Secure QR-Based Attendance System  
**Institution:** DBS Global University (DGU)  
**Date:** October 2026  
**Status:** In Progress / Implementation Audit  

---

## 1. Executive Summary & Architectural Scope

Phase 17 delivers a secure, tamper-proof, end-to-end QR code attendance workflow integrated directly into the Camu-Next unified campus portal. The implementation establishes a bidirectional bridge between:
1. **Faculty Portal (`FacultyAttendanceView.tsx`)**: Dynamic session initiation, live cryptographic QR token generation with automatic rotation, real-time check-in stream, and an atomic closure/finalization mechanism.
2. **Student Portal (`SmartTimetable.tsx` / `StudentDashboard.tsx`)**: Context-aware timetable action ("Mark Attendance" appearing only when an eligible session is currently open), in-app HTML5 camera scanner with permission handling, and instant summary recalculation.
3. **Backend Express 5 Engine & PostgreSQL Database**: Server-side HMAC-SHA256 signature verification, strict role-based access control (RBAC), multi-layer enrollment validation, concurrency-safe transactional upserts, and enforcement of the institutional attendance policy upon session closure.

---

## 2. Existing Schema & Model Reuse (Zero Schema Breakage)

The existing Prisma schema (`docs/database/schema.prisma`) already encapsulates the relational semantics required for attendance:

```prisma
model AttendanceSession {
  id               String           @id @default(uuid())
  courseOfferingId String           @map("course_offering_id")
  slotId           String?          @map("slot_id")
  facultyId        String           @map("faculty_id")
  sessionDate      DateTime         @map("session_date")
  startTime        String           @map("start_time")
  topicTaught      String?          @map("topic_taught")
  markedAt         DateTime         @default(now()) @map("marked_at")
  isLocked         Boolean          @default(false) @map("is_locked")
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")

  courseOffering CourseOffering     @relation(fields: [courseOfferingId], references: [id], onDelete: Cascade)
  faculty        User               @relation(fields: [facultyId], references: [id], onDelete: Cascade)
  records        AttendanceRecord[]

  @@index([courseOfferingId])
  @@index([facultyId])
  @@index([sessionDate])
  @@map("attendance_sessions")
}

model AttendanceRecord {
  id        String           @id @default(uuid())
  sessionId String           @map("session_id")
  studentId String           @map("student_id")
  status    AttendanceStatus @default(ABSENT)
  remarks   String?
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  session AttendanceSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  student User              @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([sessionId, studentId])
  @@index([studentId])
  @@index([sessionId])
  @@map("attendance_records")
}
```

### Key Architectural Findings:
1. **Concurrency & Idempotency Guarantee**: The existing composite unique constraint `@@unique([sessionId, studentId])` guarantees that concurrent or repeated submissions cannot produce duplicate attendance records at the database level.
2. **Session Finalization via `isLocked`**: The boolean flag `isLocked` serves as the authoritative boundary for session finalization. When `isLocked === true`, the backend rejects any check-in attempts with HTTP 409 Conflict.
3. **Institutional Policy Enforcement**: When faculty closes an attendance session, all enrolled students who did not check in or receive manual exemption are recorded as `ABSENT`. This preserves institutional audit compliance without altering the schema.

---

## 3. Cryptographic QR Token Lifecycle & Security Design

To prevent replay attacks, unauthorized generation, link sharing, and token tampering:

### 3.1 Token Format
The QR payload is an authenticated string formatted as:
```text
<sessionId>.<courseOfferingId>.<nonce>.<expiresAt>.<signature>
```
Where:
- `sessionId`: UUID of the active `AttendanceSession`.
- `courseOfferingId`: UUID of the associated `CourseOffering`.
- `nonce`: Cryptographically secure 8-byte hex string (`crypto.randomBytes(8).toString('hex')`) to prevent replay of expired or stale tokens.
- `expiresAt`: UNIX timestamp (in milliseconds) representing strict token expiry (default: 60 seconds).
- `signature`: HMAC-SHA256 digest of `${sessionId}:${courseOfferingId}:${nonce}:${expiresAt}` signed with server secret (`config.SESSION_SECRET`).

### 3.2 Security Properties
- **Zero Client Trust**: The client never decides attendance validity; the server verifies the cryptographic signature before performing any database write.
- **Short Lifetime with Dynamic Rotation**: Tokens expire in 60 seconds. The faculty UI automatically queries a refreshed token before expiration while keeping the session open.
- **Replay & Sharing Protection**:
  - Scanning a copied token after 60s fails signature/expiry checks.
  - Scanning a valid token by an ineligible student (not enrolled in the offering) is rejected by enrollment verification.
  - Scanning by non-student accounts (Faculty, Admin) is blocked by RBAC.
  - Scanning twice by the same student produces zero duplicate records (`@@unique([sessionId, studentId])`).
- **Session Closure Invalidation**: If faculty clicks "Close Attendance", the session becomes `isLocked = true`. Even if a QR token has remaining seconds on its countdown, check-in is rejected immediately.
- **No Sensitive Data**: Tokens contain no student PII, grades, or reusable auth credentials.

---

## 4. API Endpoints & Authorization Matrix

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/attendance/sessions/:id/qr/generate` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Generates a signed QR token with 60s validity and rotation nonce. |
| `GET` | `/api/attendance/sessions/:id/qr/status` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Returns live check-in counts (`present`, `absent`, `totalEnrolled`), list of checked-in students, and `isLocked`. |
| `POST` | `/api/attendance/sessions/:id/close` | `FACULTY`, `HOD`, `DEAN`, `REGISTRAR_ADMIN` | Atomically locks the session, marks unrecorded enrolled students as `ABSENT`, and returns final counts. |
| `GET` | `/api/attendance/active-sessions` | `STUDENT` | Returns currently open (unlocked) attendance sessions for courses the authenticated student is enrolled in. |
| `POST` | `/api/attendance/qr/check-in` | `STUDENT` | Validates QR token, checks enrollment and session state, records student as `PRESENT`. |

---

## 5. End-to-End Verification Matrix (15 Mandatory Tests)

| # | Test Scenario | Expected Status / Behavior | Verification |
| :- | :--- | :--- | :--- |
| 1 | Authorized faculty opens QR session for assigned course | HTTP 201 / HTTP 200, valid token generated | Automated & Unit |
| 2 | Unauthorized faculty cannot generate QR for unassigned course | HTTP 403 Forbidden | Automated & Unit |
| 3 | Eligible enrolled student checks in successfully | HTTP 200, status `PRESENT` recorded | Automated & Unit |
| 4 | Unauthenticated request to check-in endpoint | HTTP 401 Unauthorized | Automated & Unit |
| 5 | Faculty/Admin cannot use student check-in endpoint | HTTP 403 Forbidden | Automated & Unit |
| 6 | Student checks in to unassigned/unenrolled course | HTTP 400 Bad Request ("not enrolled") | Automated & Unit |
| 7 | Invalid, tampered, expired, or malformed QR token | HTTP 400 Bad Request ("Invalid/Expired token") | Automated & Unit |
| 8 | Duplicate scan by same student does not increment count | HTTP 200 / 409, records count remains 1 | Automated & Unit |
| 9 | Concurrent duplicate scans produce exactly one record | Exactly 1 record created in database | Concurrency Test |
| 10 | Closed / locked session rejects subsequent check-ins | HTTP 409 Conflict ("Session is locked") | Automated & Unit |
| 11 | Student cannot check in for another student (identity spoofing) | Enforces `req.user.id` strictly | Automated & Unit |
| 12 | Existing manual attendance & session locking continue to pass | All Phase 3 & Phase 16 suites pass | Vitest Regression |
| 13 | Student attendance summary reflects saved QR check-in | `/api/attendance/my-summary` updated | Automated & Unit |
| 14 | Scanner permission denial, device errors handled gracefully | User-friendly UI recovery instructions | Component & UI |
| 15 | Faculty live roster & final counts reflect persisted DB records | Accurate count of Present & Absent | Automated & E2E |

---

## 6. Implementation Plan & File Touchpoints

1. **Dependencies**: `qrcode` + `@types/qrcode` (for fast, zero-dependency classroom QR rendering), `html5-qrcode` (for camera QR scanning).
2. **Backend**:
   - `server/src/utils/qrToken.ts`: Token signing, verification, and expiration logic.
   - `server/src/types/attendance.ts`: DTO schemas for QR generation, check-in, and session closure.
   - `server/src/repositories/attendance.repository.ts`: Concurrency-safe check-in, active session query, and atomic closure methods.
   - `server/src/services/attendance.service.ts`: Business logic and authorization guards.
   - `server/src/controllers/attendance.controller.ts`: Request handling and sanitized response mapping.
   - `server/src/routes/attendance.route.ts`: Route registration with RBAC and validation middlewares.
3. **Frontend**:
   - `src/api/attendance.ts`: Client endpoints for active sessions, QR generation, status polling, check-in, and session closure.
   - `src/components/FacultyAttendanceView.tsx`: "Generate QR" modal, countdown timer, auto-refreshing QR token, live check-in roster, and "Close Attendance" finalization.
   - `src/components/SmartTimetable.tsx`: "Mark Attendance" button on active class card opening `QrScannerModal`.
   - `src/components/QrScannerModal.tsx`: Accessible camera scanner with fallback instructions, loading indicators, and retry controls.
4. **Automated Suite**:
   - `server/tests/qrAttendance.test.ts`: Comprehensive test suite verifying all 15 audit criteria.
