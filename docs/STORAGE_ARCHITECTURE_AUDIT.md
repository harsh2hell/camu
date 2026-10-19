# Storage Architecture & Readiness Audit — DBS Camu-Next

**Document Version:** 1.0 (Phase 5.3)  
**Date:** October 2026  
**Auditor:** DBS Camu-Next Core Architecture Team  
**Scope:** File Lifecycle, Fail-Closed Ownership Verification, and Storage Readiness Audit  

---

## 1. Executive Summary & Production Readiness Reality

Camu-Next utilizes **local filesystem storage** (`server/uploads/`, configured via `UPLOAD_DIR`) paired with **authoritative PostgreSQL metadata persistence** (`uploaded_files` table). 

> [!IMPORTANT]
> **Production Storage Disclosure:**
> Local disk storage is suitable **ONLY** for local development, testing, and single-node monolithic servers with dedicated persistent block volumes. **It is NOT suitable for cloud-native ephemeral or horizontally-scaled production environments.** No S3-compatible integration or automated malware scanning pipeline currently exists in the codebase, and none is claimed.

---

## 2. Current Implementation Analysis

### 2.1 Storage Pipeline
1. **Payload Ingestion:** Files are uploaded via `POST /api/assignments/upload` (as multipart or Base64 payloads) or directly embedded during submission.
2. **Buffer Validation:** Validates file size (≤ 10 MB), permitted extensions, header magic bytes (PDF, PNG, JPG, ZIP/DOCX), and checks for disguised executables (PE/EXE, ELF, Mach-O, null bytes in code).
3. **Physical Storage:** Stored on the local filesystem in `UPLOAD_DIR` with a server-generated UUID filename and restricted permissions (`0o600` — user read/write only).
4. **Authoritative Ownership Persistence:** Records are persisted in PostgreSQL table `uploaded_files` (`file_key`, `original_name`, `size_bytes`, `mime_type`, `user_id`, `created_at`).
5. **Private File Delivery:** Direct public static file serving (`express.static`) is completely disabled. Files can only be downloaded through authenticated, role-verified proxy endpoints (`GET /api/assignments/:id/submission/file`, `GET /api/assignments/:id/submissions/:submissionId/file`, and `GET /api/assignments/:id/attachment`).

### 2.2 Scope 1: Fail-Closed Ownership Verification During Database Outages
- **Verification Rule:** `FileStorage.verifyUploadOwnership(fileKey, userId)` is executed prior to attaching any file to an assignment or submission.
- **Authoritative Database Lookups:** Checks `uploaded_files` (uploaded by user), `assignment_submissions` (existing submission by student), and `assignments` (attachment for course).
- **Fail-Closed on Database Outage:** If PostgreSQL is unreachable or throws a connection/query error, verification **fails closed** by throwing `ServiceUnavailableError` (HTTP 503). It **never** falls back to approving unauthoritative cached uploads.
- **Fail-Closed on Unknown Keys:** If the file key does not exist in `uploaded_files`, `assignment_submissions`, or `assignments`, verification fails closed with `NotFoundError` (HTTP 404).
- **Cross-User Protection:** In-memory registry provides defensive preliminary filtering; PostgreSQL provides authoritative verification. Any cross-user attachment attempt throws `ForbiddenError` (HTTP 403).

### 2.3 Scope 2: File Lifecycle & Conservative Orphan Cleanup
The application provides an automated, conservative cleanup engine (`FileStorage.cleanupOrphanFiles`) exposed to `REGISTRAR_ADMIN` via `POST /api/assignments/cleanup`:

| File State | Handling Strategy | Safety Mechanism |
| :--- | :--- | :--- |
| **Active Submissions & Assignments** | Retained indefinitely | Files present in `assignment_submissions` or `assignments` are added to `activeFileKeys` and **never** deleted. |
| **In-Flight / Drafting Uploads** | Retained | Protected by a configurable **24-hour grace period** (`gracePeriodHours: 24`). Recent files are never touched to prevent racing with user submission forms. |
| **Replaced / Unreferenced Uploads** | Safely purged after grace period | Unreferenced files older than 24 hours are unlinked from disk and their `uploaded_files` rows deleted. |
| **Dangling Metadata (No Physical File)** | Purged from PostgreSQL | Metadata rows older than 24 hours whose physical files are missing from disk are purged to maintain database integrity. |
| **Untracked Physical Files** | Safely purged from disk | Files in `server/uploads/` older than 24 hours with no corresponding `uploaded_files` or submission references are deleted. |
| **Logging & Privacy** | Sanitized | Cleanup logs aggregate statistics or sanitized UUID keys; sensitive paths and student PII are never exposed. |

---

## 3. Operational Suitability & Limitations of Local Storage

Local disk storage presents severe architectural constraints in modern cloud deployments:

| Deployment Model | Suitability | Critical Risk / Failure Mode |
| :--- | :--- | :--- |
| **Local Development & Testing** | ✅ Suitable | Single-node, persistent directory on developer machine. |
| **Single-Node VPS (Dedicated Volume)** | ⚠️ Conditional | Requires persistent volume mount; no redundancy or automatic horizontal failover. |
| **Containerized Horizontal Scaling (K8s / ECS)** | ❌ Unsuitable | Split-brain filesystem: Upload on Pod A is inaccessible from Pod B, causing 404s on downloads. |
| **Serverless / Ephemeral Containers (Cloud Run / Fargate)** | ❌ Fatal | Ephemeral container storage is destroyed on container shutdown or scale-down, permanently losing student files. |

---

## 4. Architecture Requirements for Production Object Storage

To achieve true production readiness for DBS Global University, the following object storage architecture must be implemented:

```
[Student / Faculty Browser]
       │
       │ 1. Request Signed Upload URL
       ▼
[Camu Express API] ───(Validate Auth, RBAC, File Mime/Size)───► [Authoritative PostgreSQL]
       │                                                               ▲
       │ 2. Return Pre-Signed S3/R2 PUT URL (TTL: 15 min)             │ 4. Confirm Upload
       ▼                                                               │
[Student / Faculty Browser] ─── 3. Direct Upload ───► [S3 / Cloudflare R2 Bucket]
                                                              │
                                                              ▼ (ObjectCreated Event)
                                                      [Malware Scan Queue]
                                                              │
                                                              ▼
                                                   [ClamAV / AWS GuardDuty]
```

### 4.1 Required Production Enhancements:
1. **Object Storage Provider:**
   - AWS S3, Cloudflare R2, or Google Cloud Storage (GCS).
   - Server-side encryption (SSE-S3 or SSE-KMS) enabled by default.
2. **Direct Pre-Signed Uploads:**
   - Client requests pre-signed `PUT` URL with short expiration (15 minutes).
   - Eliminates file streaming through the Express backend, freeing server CPU and RAM.
3. **Malware & Antivirus Pipeline:**
   - Asynchronous scanner (ClamAV container or AWS GuardDuty for S3).
   - Files placed in `quarantine/` bucket partition until scan passes; infected files permanently expunged.
4. **Secure Download Delivery:**
   - Express server checks database authorization, then issues pre-signed `GET` URL with 60-second TTL.
   - Alternatively, streaming reverse-proxy with `res.pipe()` for air-gapped deployments.
5. **S3 Lifecycle Rules:**
   - Automatic abort of incomplete multipart uploads after 24 hours.
   - Transition older academic submissions (e.g., > 1 year) to Cold Storage / Glacier.

---

## 5. Decision Log & Open Retention Policies

The following institutional retention policies require formal sign-off from the DBS Global University Academic Council:
1. **Student Submission Retention Period:** Recommendation is 5 years after student graduation before archival or permanent deletion.
2. **Draft Upload Expiration Window:** Default grace period is currently set to 24 hours; council to confirm if 48 or 72 hours is preferred during examination submission periods.
3. **Audit Trail Archival:** Audit logs of file deletions and cleanup runs to be retained in centralized SIEM for 7 years.
