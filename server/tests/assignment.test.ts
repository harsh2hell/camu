import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import {
  DEV_STUDENT_USER_ID,
  DEV_FACULTY_USER_ID,
} from '../src/repositories/attendance.repository.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { FileStorage } from '../src/lib/fileStorage.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 5: Assignments & LMS API Test Suite', () => {
  let studentCookie: string[];
  let student2Cookie: string[];
  let facultyCookie: string[];
  let faculty2Cookie: string[];
  let adminCookie: string[];

  let createdAssignmentId: string;
  let unpublishedAssignmentId: string;
  let testSubmissionId: string;

  beforeAll(async () => {
    clearRateLimitStore();

    // 1. Authenticate Student 1 (Harendra Pratap)
    const sRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(sRes.status).toBe(200);
    studentCookie = getCookies(sRes);

    // 2. Authenticate Student 2 (Aaditya Sharma)
    const s2Res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'aaditya.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(s2Res.status).toBe(200);
    student2Cookie = getCookies(s2Res);

    // 3. Authenticate Faculty 1 (Dr. Rajesh Sharma - CS302 instructor)
    const fRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'faculty.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(fRes.status).toBe(200);
    facultyCookie = getCookies(fRes);

    // 4. Authenticate Faculty 2 (Prof. Ananya Sen - CS304 instructor)
    const f2Res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'ananya.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(f2Res.status).toBe(200);
    faculty2Cookie = getCookies(f2Res);

    // 5. Authenticate Registrar Admin (admin.dev@dgu.ac.in)
    const admRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'admin.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(admRes.status).toBe(200);
    adminCookie = getCookies(admRes);
  });

  afterAll(async () => {
    // Clean up created assignments and submissions
    if (createdAssignmentId) {
      await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: createdAssignmentId } });
      await prisma.assignment.deleteMany({ where: { id: createdAssignmentId } });
    }
    if (unpublishedAssignmentId) {
      await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: unpublishedAssignmentId } });
      await prisma.assignment.deleteMany({ where: { id: unpublishedAssignmentId } });
    }
    // Clean up any submissions on seeded assignments made during test
    await prisma.assignmentSubmission.deleteMany({
      where: {
        studentId: { in: [DEV_STUDENT_USER_ID, 'a0000000-0000-4000-8000-000000000003'] },
      },
    });
    clearRateLimitStore();
  });

  // ============================================================================
  // 1. STUDENT ASSIGNMENT ACCESS & LISTING
  // ============================================================================
  describe('1. Student Assignment Access & Retrieval', () => {
    it('1.1 should allow student to list assignments for enrolled courses', async () => {
      const res = await request(app)
        .get('/api/assignments/student')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const first = res.body.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('courseCode');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('dueDate');
      expect(first).toHaveProperty('totalMarks');
      expect(first).toHaveProperty('submissionStatus');
    });

    it('1.2 should retrieve assignment details for an enrolled student', async () => {
      const res = await request(app)
        .get('/api/assignments/a5900001-0000-4000-8000-000000000001')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe('a5900001-0000-4000-8000-000000000001');
      expect(res.body.data.title).toContain('Problem Set 4');
    });

    it('1.3 should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/assignments/student');
      expect(res.status).toBe(401);
    });

    it('1.4 should reject student access to non-existent assignment with 404', async () => {
      const res = await request(app)
        .get('/api/assignments/00000000-0000-0000-0000-000000000000')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // 2. FACULTY ASSIGNMENT CREATION & AUTHORIZATION
  // ============================================================================
  describe('2. Faculty Assignment Management & RBAC', () => {
    it('2.1 should allow faculty to list assignments for their courses', async () => {
      const res = await request(app)
        .get('/api/assignments/faculty')
        .set('Cookie', facultyCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('2.2 should reject student attempting to access faculty assignments with 403', async () => {
      const res = await request(app)
        .get('/api/assignments/faculty')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(403);
    });

    it('2.3 should allow faculty to create a new assignment for their own course offering', async () => {
      const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', facultyCookie)
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001', // CS302 taught by Dr. Rajesh Sharma
          title: 'Lab Exercise 5: Shortest Path Optimization in Transportation Graphs',
          description: 'Implement Floyd-Warshall and Johnson algorithms with performance benchmarking.',
          dueDate: futureDue,
          totalMarks: 50,
          isPublished: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toContain('Lab Exercise 5');
      createdAssignmentId = res.body.data.id;
    });

    it('2.4 should reject faculty attempting to create assignment for a course they do NOT teach with 403', async () => {
      const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', facultyCookie) // Dr. Rajesh Sharma
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000002', // CS304 taught by Prof. Ananya Sen
          title: 'Unauthorized Assignment Creation Attempt',
          dueDate: futureDue,
          totalMarks: 20,
        });

      expect(res.status).toBe(403);
    });

    it('2.5 should reject invalid assignment creation payload with 422 validation error', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', facultyCookie)
        .send({
          courseOfferingId: 'not-a-uuid',
          title: 'X',
          dueDate: 'invalid-date',
          totalMarks: -5,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('2.6 should allow faculty to update their own assignment', async () => {
      const res = await request(app)
        .put(`/api/assignments/${createdAssignmentId}`)
        .set('Cookie', facultyCookie)
        .send({
          title: 'Lab Exercise 5: Shortest Path Optimization (Updated Title)',
          totalMarks: 40,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toContain('(Updated Title)');
      expect(res.body.data.totalMarks).toBe(40);
    });

    it('2.7 should reject another faculty attempting to update this assignment with 403', async () => {
      const res = await request(app)
        .put(`/api/assignments/${createdAssignmentId}`)
        .set('Cookie', faculty2Cookie) // Prof. Ananya Sen
        .send({
          title: 'Malicious Update Attempt',
        });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // 3. STUDENT SUBMISSION & DEADLINE POLICIES
  // ============================================================================
  describe('3. Student Submissions & Deadline Enforcement', () => {
    it('3.1 should allow enrolled student to submit on-time assignment with text and file metadata', async () => {
      // Stage upload first
      const pdfBase64 = Buffer.from('%PDF-1.4 sample pdf content for Floyd-Warshall solution').toString('base64');
      const uploadRes = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'harendra_lab5_solution.pdf',
          fileData: pdfBase64,
        });
      expect(uploadRes.status).toBe(200);

      const res = await request(app)
        .post(`/api/assignments/${createdAssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Python implementation of Floyd-Warshall with sample adjacency matrices attached.',
          submissionFileUrl: uploadRes.body.data.fileUrl,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('SUBMITTED_ON_TIME');
      expect(res.body.isLate).toBe(false);
      testSubmissionId = res.body.data.id;
    });

    it('3.2 should allow student to retrieve their own submission', async () => {
      const res = await request(app)
        .get(`/api/assignments/${createdAssignmentId}/submission`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testSubmissionId);
      expect(res.body.data.submissionText).toContain('Floyd-Warshall');
    });

    it('3.3 should allow student to update/resubmit before grading', async () => {
      // Stage updated upload first
      const pdfBase64 = Buffer.from('%PDF-1.4 revised sample pdf content v2 benchmark').toString('base64');
      const uploadRes = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'harendra_lab5_v2.pdf',
          fileData: pdfBase64,
        });
      expect(uploadRes.status).toBe(200);

      const res = await request(app)
        .post(`/api/assignments/${createdAssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Revised code submission with time complexity benchmark graph.',
          submissionFileUrl: uploadRes.body.data.fileUrl,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.submissionText).toContain('Revised code submission');
    });

    it('3.4 should reject submission without both text and file with 422', async () => {
      const res = await request(app)
        .post(`/api/assignments/${createdAssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: '',
          submissionFileUrl: '',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('3.5 should flag submission as SUBMITTED_LATE if past due date', async () => {
      // Create a test assignment with a past due date
      const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const pastAssn = await prisma.assignment.create({
        data: {
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          title: 'Past Due Assignment Test',
          dueDate: new Date(pastDue),
          totalMarks: 20,
          isPublished: true,
        },
      });

      const res = await request(app)
        .post(`/api/assignments/${pastAssn.id}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Submitting after deadline.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SUBMITTED_LATE');
      expect(res.body.isLate).toBe(true);

      // Clean up
      await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: pastAssn.id } });
      await prisma.assignment.delete({ where: { id: pastAssn.id } });
    });
  });

  // ============================================================================
  // 4. PRIVACY, GRADING & FEEDBACK AUTHORIZATION
  // ============================================================================
  describe('4. Privacy, Cross-Student Protection & Faculty Grading', () => {
    it('4.1 should prevent student 2 from accessing student 1 submission directly', async () => {
      // Student 2 has not submitted yet, querying their own submission should return 404
      const res = await request(app)
        .get(`/api/assignments/${createdAssignmentId}/submission`)
        .set('Cookie', student2Cookie);

      expect(res.status).toBe(404);
    });

    it('4.2 should prevent students from accessing the faculty submission review endpoint with 403', async () => {
      const res = await request(app)
        .get(`/api/assignments/${createdAssignmentId}/submissions`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(403);
    });

    it('4.3 should allow course faculty to view all student submissions', async () => {
      const res = await request(app)
        .get(`/api/assignments/${createdAssignmentId}/submissions`)
        .set('Cookie', facultyCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const sub = res.body.data.find((s: any) => s.id === testSubmissionId);
      expect(sub).toBeDefined();
      expect(sub.studentName).toContain('Harendra');
    });

    it('4.4 should reject an unrelated faculty member from viewing submissions with 403', async () => {
      const res = await request(app)
        .get(`/api/assignments/${createdAssignmentId}/submissions`)
        .set('Cookie', faculty2Cookie);

      expect(res.status).toBe(403);
    });

    it('4.5 should allow course faculty to grade a submission and record feedback', async () => {
      const res = await request(app)
        .post(`/api/assignments/${createdAssignmentId}/submissions/${testSubmissionId}/grade`)
        .set('Cookie', facultyCookie)
        .send({
          score: 38,
          feedback: 'Excellent dynamic programming analysis and clean implementation.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('GRADED');
      expect(Number(res.body.data.score)).toBe(38);
      expect(res.body.data.feedback).toContain('Excellent dynamic programming');
    });

    it('4.6 should reject score higher than assignment totalMarks with 400', async () => {
      const res = await request(app)
        .post(`/api/assignments/${createdAssignmentId}/submissions/${testSubmissionId}/grade`)
        .set('Cookie', facultyCookie)
        .send({
          score: 999, // Total marks is 40
          feedback: 'Invalid high score',
        });

      expect(res.status).toBe(400);
    });

    it('4.7 should reject resubmission after assignment has been graded with 400', async () => {
      const res = await request(app)
        .post(`/api/assignments/${createdAssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Attempting to resubmit after already receiving grade.',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('already been graded');
    });

    it('4.8 should reflect the grade and feedback in student submission query', async () => {
      const res = await request(app)
        .get(`/api/assignments/${createdAssignmentId}/submission`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('GRADED');
      expect(Number(res.body.data.score)).toBe(38);
      expect(res.body.data.feedback).toBeDefined();
    });
  });

  // ============================================================================
  // 5. UNPUBLISHED ASSIGNMENTS & CALENDAR LEAK PREVENTION
  // ============================================================================
  describe('5. Unpublished Assignment Isolation & Calendar Integration', () => {
    it('5.1 should create an unpublished assignment as faculty', async () => {
      const futureDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', facultyCookie)
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          title: 'Draft Surprise Pop Quiz & Assignment (Secret)',
          dueDate: futureDue,
          totalMarks: 15,
          isPublished: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isPublished).toBe(false);
      unpublishedAssignmentId = res.body.data.id;
    });

    it('5.2 should NOT show unpublished assignment in student assignments list', async () => {
      const res = await request(app)
        .get('/api/assignments/student')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      const found = res.body.data.some((a: any) => a.id === unpublishedAssignmentId);
      expect(found).toBe(false);
    });

    it('5.3 should NOT leak unpublished assignment into student academic calendar', async () => {
      const res = await request(app)
        .get('/api/calendar/events?category=DEADLINE')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      const leaked = res.body.data.events.some((e: any) => e.id === unpublishedAssignmentId);
      expect(leaked).toBe(false);
    });

    it('5.4 should reject student direct fetch of unpublished assignment with 404', async () => {
      const res = await request(app)
        .get(`/api/assignments/${unpublishedAssignmentId}`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // 6. SAFE FILE UPLOAD FOUNDATION
  // ============================================================================
  describe('6. Safe File Upload Endpoint & Extension Validation', () => {
    it('6.1 should successfully upload a valid text/pdf file payload', async () => {
      const fileContentBase64 = Buffer.from('console.log("Hello Algorithmic World");').toString('base64');

      const res = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'solution_code.py',
          fileData: fileContentBase64,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.fileUrl).toMatch(/^\/uploads\/[a-f0-9\-]+\.py$/);
      expect(res.body.data.originalName).toBe('solution_code.py');
    });

    it('6.2 should reject disallowed file extensions (e.g. .exe, .sh) with 400', async () => {
      const evilScript = Buffer.from('rm -rf /').toString('base64');

      const res = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'malicious.sh',
          fileData: evilScript,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('not permitted');
    });
  });

  // ============================================================================
  // 7. SECURITY HARDENING, CONTENT INSPECTION & AUTHORIZATION (PHASE 5.1)
  // ============================================================================
  describe('7. Security Hardening, Content Inspection & Authorization (Phase 5.1)', () => {
    let hardenedAssignmentId: string;
    let realFileSubmissionId: string;
    let uploadedFileUrl: string;
    let validPdfBase64: string;

    beforeAll(async () => {
      // Create a dedicated assignment for section 7 tests
      validPdfBase64 = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Test Assignment Brief) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF').toString('base64');

      const createRes = await request(app)
        .post('/api/assignments')
        .set('Cookie', facultyCookie)
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001', // CS302 Sec A
          title: 'Hardened Security & Verification Lab',
          description: 'Testing magic bytes, private downloads, and ownership isolation.',
          dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
          totalMarks: 50,
          isPublished: true,
          attachmentFileName: 'assignment_brief.pdf',
          attachmentData: validPdfBase64,
        });

      expect(createRes.status).toBe(201);
      hardenedAssignmentId = createRes.body.data.id;
    });

    afterAll(async () => {
      if (hardenedAssignmentId) {
        await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: hardenedAssignmentId } });
        await prisma.assignment.deleteMany({ where: { id: hardenedAssignmentId } });
      }
    });

    // 7.1 Private File Access & Authentication
    it('7.1 should reject unauthenticated file download requests with 401', async () => {
      // 1. Student submission download without auth
      const res1 = await request(app).get(`/api/assignments/${hardenedAssignmentId}/submission/file`);
      expect(res1.status).toBe(401);

      // 2. Faculty submission download without auth
      const res2 = await request(app).get(`/api/assignments/${hardenedAssignmentId}/submissions/00000000-0000-0000-0000-000000000000/file`);
      expect(res2.status).toBe(401);

      // 3. Assignment attachment download without auth
      const res3 = await request(app).get(`/api/assignments/${hardenedAssignmentId}/attachment`);
      expect(res3.status).toBe(401);
    });

    it('7.2 should confirm Express static public /uploads route is completely closed', async () => {
      const res = await request(app).get('/uploads/secret_submission.pdf');
      expect(res.status).toBe(404);
    });

    // 7.2 Upload Ownership & Cross-User Attachment Prevention
    it('7.3 should reject student attempting to attach a file uploaded by another user with 403', async () => {
      // Student 1 uploads a legitimate python script
      const validCodeBase64 = Buffer.from('def solve():\n    return 42\n').toString('base64');
      const uploadRes = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'student1_solution.py',
          fileData: validCodeBase64,
        });
      expect(uploadRes.status).toBe(200);
      uploadedFileUrl = uploadRes.body.data.fileUrl;

      // Student 2 attempts to use Student 1's uploaded file in their own submission
      const subRes = await request(app)
        .post(`/api/assignments/${hardenedAssignmentId}/submit`)
        .set('Cookie', student2Cookie)
        .send({
          submissionFileUrl: uploadedFileUrl,
          submissionText: 'Trying to reuse student 1 file',
        });

      expect(subRes.status).toBe(403);
      expect(subRes.body.error.message).toContain('not authorized to attach');
    });

    // 7.3 File Validation & Magic Bytes Inspection
    it('7.4 should reject files exceeding the 10MB size limit with 400', async () => {
      // 10.5 MB of data
      const largeBuffer = Buffer.alloc(10.5 * 1024 * 1024, 65); // 10.5 MB of 'A'
      const largeBase64 = largeBuffer.toString('base64');

      const res = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'oversized_file.pdf',
          fileData: largeBase64,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('File size exceeds 10MB limit');
    });

    it('7.5 should reject disguised Windows PE / EXE disguised with .pdf extension', async () => {
      // MZ header (DOS/PE executable)
      const mzExecutable = Buffer.concat([Buffer.from('MZ\x90\x00\x03\x00\x00\x00'), Buffer.alloc(100)]);
      const res = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'trojan_payload.pdf',
          fileData: mzExecutable.toString('base64'),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Executable file formats (Windows PE/EXE/DLL) are strictly prohibited');
    });

    it('7.6 should reject disguised Linux ELF executable disguised with .pdf extension', async () => {
      // ELF header
      const elfExecutable = Buffer.concat([Buffer.from('\x7fELF\x02\x01\x01\x00'), Buffer.alloc(100)]);
      const res = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'rootkit_exploit.pdf',
          fileData: elfExecutable.toString('base64'),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Executable file formats (Linux ELF) are strictly prohibited');
    });

    it('7.7 should reject source code file containing null bytes or binary executable signature', async () => {
      // .py file with null bytes
      const binaryInPy = Buffer.concat([Buffer.from('# Python script\nprint("hi")\n'), Buffer.from([0x00, 0x00, 0x00, 0x01])]);
      const res = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'bad_script.py',
          fileData: binaryInPy.toString('base64'),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('contains illegal null bytes');
    });

    it('7.8 should accept a genuine PDF file with %PDF magic bytes', async () => {
      const res = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'genuine_doc.pdf',
          fileData: validPdfBase64,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fileUrl).toContain('/uploads/');
    });

    // 7.4 Submission, Download and Authorization Isolation
    it('7.9 should submit assignment with direct file upload and verify file permissions', async () => {
      const codeBuffer = Buffer.from('def calculate_grade():\n    return 100\n');
      const submitRes = await request(app)
        .post(`/api/assignments/${hardenedAssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          fileName: 'student1_calc.py',
          fileData: codeBuffer.toString('base64'),
          submissionText: 'Submitting Python source code directly',
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.submissionFileUrl).toBe(`/api/assignments/${hardenedAssignmentId}/submission/file`);
      realFileSubmissionId = submitRes.body.data.id;
    });

    it('7.10 should allow student to download their own submission file with proper headers', async () => {
      const res = await request(app)
        .get(`/api/assignments/${hardenedAssignmentId}/submission/file`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment; filename="submission_');
      expect(res.text).toContain('def calculate_grade():');
    });

    it('7.11 should prevent Student 2 from downloading Student 1 submission file', async () => {
      // Student 2 has not submitted for this assignment, so their submission file endpoint returns 404
      const res = await request(app)
        .get(`/api/assignments/${hardenedAssignmentId}/submission/file`)
        .set('Cookie', student2Cookie);

      expect(res.status).toBe(404);
    });

    it('7.12 should reject unrelated faculty (Faculty 2) from downloading student submission file with 403', async () => {
      const res = await request(app)
        .get(`/api/assignments/${hardenedAssignmentId}/submissions/${realFileSubmissionId}/file`)
        .set('Cookie', faculty2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('not authorized to access submissions for this course offering');
    });

    it('7.13 should allow course faculty (Faculty 1) to download student submission file', async () => {
      const res = await request(app)
        .get(`/api/assignments/${hardenedAssignmentId}/submissions/${realFileSubmissionId}/file`)
        .set('Cookie', facultyCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment; filename="student.dev_');
      expect(res.text).toContain('def calculate_grade():');
    });

    it('7.14 should allow enrolled student to download assignment attachment brief', async () => {
      const res = await request(app)
        .get(`/api/assignments/${hardenedAssignmentId}/attachment`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment; filename="brief_');
    });

    // 7.5 Grade Boundary & Integrity Enforcement
    it('7.15 should reject negative score with 422/400 validation error', async () => {
      const res = await request(app)
        .post(`/api/assignments/${hardenedAssignmentId}/submissions/${realFileSubmissionId}/grade`)
        .set('Cookie', facultyCookie)
        .send({
          score: -10,
          feedback: 'Negative score test',
        });

      expect([400, 422]).toContain(res.status);
    });

    it('7.16 should allow valid boundary score of 0', async () => {
      const res = await request(app)
        .post(`/api/assignments/${hardenedAssignmentId}/submissions/${realFileSubmissionId}/grade`)
        .set('Cookie', facultyCookie)
        .send({
          score: 0,
          feedback: 'Zero score is a valid lower boundary',
        });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.score)).toBe(0);
    });

    it('7.17 should allow re-grading with valid score and prevent lowering assignment totalMarks below it', async () => {
      // Grade with 45 / 50
      const gradeRes = await request(app)
        .post(`/api/assignments/${hardenedAssignmentId}/submissions/${realFileSubmissionId}/grade`)
        .set('Cookie', facultyCookie)
        .send({
          score: 45,
          feedback: 'Great effort',
        });
      expect(gradeRes.status).toBe(200);

      // Now faculty attempts to lower assignment totalMarks to 40 (below awarded 45)
      const updateRes = await request(app)
        .put(`/api/assignments/${hardenedAssignmentId}`)
        .set('Cookie', facultyCookie)
        .send({
          totalMarks: 40,
        });

      expect(updateRes.status).toBe(400);
      expect(updateRes.body.error.message).toContain('Cannot reduce total marks to 40');
    });

    it('7.18 should reject student attempt to resubmit once submission is graded', async () => {
      const res = await request(app)
        .post(`/api/assignments/${hardenedAssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Trying to overwrite after grading',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('already been graded');
    });

    // 7.6 Draft Assignment Attachment Isolation
    it('7.19 should reject student attempt to download attachment from unpublished assignment with 404', async () => {
      const res = await request(app)
        .get(`/api/assignments/${unpublishedAssignmentId}/attachment`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(404);
    });

    // 7.7 Concurrent Submission Resilience
    it('7.20 should handle concurrent submissions safely without database corruption', async () => {
      // Create a fresh assignment for concurrent testing
      const concAssignRes = await request(app)
        .post('/api/assignments')
        .set('Cookie', facultyCookie)
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          title: 'Concurrency Safety Lab',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          totalMarks: 100,
          isPublished: true,
        });
      expect(concAssignRes.status).toBe(201);
      const concId = concAssignRes.body.data.id;

      try {
        // Send two concurrent submissions for student 2 simultaneously
        const [sub1, sub2] = await Promise.all([
          request(app)
            .post(`/api/assignments/${concId}/submit`)
            .set('Cookie', student2Cookie)
            .send({ submissionText: 'Concurrent Payload Alpha' }),
          request(app)
            .post(`/api/assignments/${concId}/submit`)
            .set('Cookie', student2Cookie)
            .send({ submissionText: 'Concurrent Payload Beta' }),
        ]);

        // Both should complete successfully without 500 error or duplicate key crashes
        expect([200, 201]).toContain(sub1.status);
        expect([200, 201]).toContain(sub2.status);

        // Verify in database that exactly ONE submission record exists for student2
        const count = await prisma.assignmentSubmission.count({
          where: {
            assignmentId: concId,
            studentId: 'a0000000-0000-4000-8000-000000000003',
          },
        });
        expect(count).toBe(1);
      } finally {
        await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: concId } });
        await prisma.assignment.deleteMany({ where: { id: concId } });
      }
    });
  });

  // ============================================================================
  // 8. PHASE 5.2: DURABLE FILE OWNERSHIP & CONCURRENT INTEGRITY TESTS
  // ============================================================================
  describe('8. Phase 5.2: Durable File Ownership & Concurrent Integrity Tests', () => {
    let phase52AssignmentId: string;
    let durableUploadedUrl: string;

    beforeAll(async () => {
      // Create dedicated assignment for Phase 5.2 tests
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', facultyCookie)
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          title: 'Phase 5.2 Concurrency & Persistence Lab',
          dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          totalMarks: 50,
          isPublished: true,
        });
      expect(res.status).toBe(201);
      phase52AssignmentId = res.body.data.id;
    });

    afterAll(async () => {
      if (phase52AssignmentId) {
        await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: phase52AssignmentId } });
        await prisma.assignment.deleteMany({ where: { id: phase52AssignmentId } });
      }
    });

    it('8.1 should verify uploaded file ownership survives an in-memory cache clear (simulating restart)', async () => {
      // 1. Student 1 uploads a valid script
      const codeBase64 = Buffer.from('print("Persistence verified across restarts")').toString('base64');
      const uploadRes = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'durable_script.py',
          fileData: codeBase64,
        });
      expect(uploadRes.status).toBe(200);
      durableUploadedUrl = uploadRes.body.data.fileUrl;

      // 2. Clear in-memory upload registry completely to simulate Express server restart or alternate instance
      FileStorage.uploadRegistry.clear();
      expect(FileStorage.uploadRegistry.size).toBe(0);

      // 3. Verify record exists in PostgreSQL uploaded_files table
      const fileKey = durableUploadedUrl.replace('/uploads/', '');
      const dbRow = await prisma.uploadedFile.findUnique({
        where: { fileKey },
      });
      expect(dbRow).toBeDefined();
      expect(dbRow?.uploadedById).toBe(DEV_STUDENT_USER_ID);

      // 4. Student 2 attempts to attach Student 1's file after restart
      const attachRes = await request(app)
        .post(`/api/assignments/${phase52AssignmentId}/submit`)
        .set('Cookie', student2Cookie)
        .send({
          submissionFileUrl: durableUploadedUrl,
          submissionText: 'Attempting cross-student file reuse after server restart',
        });
      expect(attachRes.status).toBe(403);
      expect(attachRes.body.error.message).toContain('not authorized to attach files uploaded by another user');

      // 5. Legitimate owner (Student 1) attaches file after restart -> succeeds!
      const ownerRes = await request(app)
        .post(`/api/assignments/${phase52AssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionFileUrl: durableUploadedUrl,
          submissionText: 'Owner submitting file after restart',
        });
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.submissionFileUrl).toBe(`/api/assignments/${phase52AssignmentId}/submission/file`);
    });

    it('8.2 should prevent race condition between concurrent grading and totalMarks reduction', async () => {
      // Setup: Assignment has totalMarks = 50.
      // Student 1 has submitted.
      const student1Sub = await prisma.assignmentSubmission.findUnique({
        where: {
          assignmentId_studentId: {
            assignmentId: phase52AssignmentId,
            studentId: DEV_STUDENT_USER_ID,
          },
        },
      });
      expect(student1Sub).toBeDefined();
      const submissionId = student1Sub!.id;

      // Reset submission status to SUBMITTED_ON_TIME for fresh grading test
      await prisma.assignmentSubmission.update({
        where: { id: submissionId },
        data: { status: 'SUBMITTED_ON_TIME', score: null, feedback: null },
      });

      // Fire concurrent requests:
      // Request A: Faculty grades submission with 45 marks (which is <= current totalMarks 50)
      // Request B: Faculty attempts to reduce totalMarks to 35 (which would be invalid if score 45 is awarded)
      const [gradeResult, updateResult] = await Promise.all([
        request(app)
          .post(`/api/assignments/${phase52AssignmentId}/submissions/${submissionId}/grade`)
          .set('Cookie', facultyCookie)
          .send({ score: 45, feedback: 'Concurrent grading race test' }),
        request(app)
          .put(`/api/assignments/${phase52AssignmentId}`)
          .set('Cookie', facultyCookie)
          .send({ totalMarks: 35 }),
      ]);

      // Database verification:
      const updatedAssign = await prisma.assignment.findUnique({
        where: { id: phase52AssignmentId },
        include: { submissions: true },
      });
      const gradedSub = updatedAssign?.submissions.find(s => s.id === submissionId);

      // Invariant: totalMarks MUST NEVER be less than awarded score!
      if (gradedSub && gradedSub.score !== null) {
        expect(Number(updatedAssign!.totalMarks)).toBeGreaterThanOrEqual(Number(gradedSub.score));
      }

      // Either:
      // 1. Grading succeeded first (200), and update was blocked (400) because 35 < 45, OR
      // 2. Update succeeded first (200, totalMarks = 35), and grading with 45 was blocked (400) because 45 > 35.
      const isConsistent =
        (gradeResult.status === 200 && updateResult.status === 400) ||
        (gradeResult.status === 400 && updateResult.status === 200);
      expect(isConsistent).toBe(true);
    });

    it('8.3 should handle multiple concurrent students submitting simultaneously without data loss', async () => {
      // Create a dedicated assignment for concurrent submissions test
      const assignRes = await request(app)
        .post('/api/assignments')
        .set('Cookie', facultyCookie)
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          title: 'Concurrent Multi-Student Submissions Test',
          dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          totalMarks: 100,
          isPublished: true,
        });
      expect(assignRes.status).toBe(201);
      const testAssignId = assignRes.body.data.id;

      try {
        // Send concurrent submissions for Student 1 and Student 2 on this fresh assignment
        const [res1, res2] = await Promise.all([
          request(app)
            .post(`/api/assignments/${testAssignId}/submit`)
            .set('Cookie', studentCookie)
            .send({ submissionText: 'Student 1 concurrent submit' }),
          request(app)
            .post(`/api/assignments/${testAssignId}/submit`)
            .set('Cookie', student2Cookie)
            .send({ submissionText: 'Student 2 concurrent submit' }),
        ]);

        expect([200, 201]).toContain(res1.status);
        expect([200, 201]).toContain(res2.status);

        const count = await prisma.assignmentSubmission.count({
          where: { assignmentId: testAssignId },
        });
        expect(count).toBe(2);
      } finally {
        await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: testAssignId } });
        await prisma.assignment.deleteMany({ where: { id: testAssignId } });
      }
    });
  });

  // ============================================================================
  // 9. PHASE 5.3: FAIL-CLOSED OWNERSHIP AND FILE LIFECYCLE AUDIT TESTS
  // ============================================================================
  describe('9. Phase 5.3: Fail-Closed Ownership and File Lifecycle Audit Tests', () => {
    let phase53AssignmentId: string;
    let outageTestFileUrl: string;

    beforeAll(async () => {
      // Create dedicated assignment for Phase 5.3 tests
      const res = await request(app)
        .post('/api/assignments')
        .set('Cookie', facultyCookie)
        .send({
          courseOfferingId: 'b0000000-0000-4000-8000-000000000001',
          title: 'Phase 5.3 Fail-Closed & Lifecycle Lab',
          dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          totalMarks: 50,
          isPublished: true,
        });
      expect(res.status).toBe(201);
      phase53AssignmentId = res.body.data.id;
    });

    afterAll(async () => {
      if (phase53AssignmentId) {
        await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: phase53AssignmentId } });
        await prisma.assignment.deleteMany({ where: { id: phase53AssignmentId } });
      }
    });

    it('9.1 should fail closed with 503 Service Unavailable when database outage occurs during ownership verification', async () => {
      // 1. Student 1 uploads a valid file
      const pdfBase64 = Buffer.from('%PDF-1.4 Phase 5.3 fail-closed verification test payload').toString('base64');
      const uploadRes = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'outage_test_doc.pdf',
          fileData: pdfBase64,
        });
      expect(uploadRes.status).toBe(200);
      outageTestFileUrl = uploadRes.body.data.fileUrl;

      // 2. Simulate database outage during ownership lookup
      const dbSpy = vi.spyOn(prisma.uploadedFile, 'findUnique').mockRejectedValueOnce(
        new Error('PostgreSQL connection pool exhausted / database down')
      );

      // 3. Attempt submission during DB outage -> MUST fail closed with 503 Service Unavailable
      const submitRes = await request(app)
        .post(`/api/assignments/${phase53AssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Submitting during database failure',
          submissionFileUrl: outageTestFileUrl,
        });

      expect(submitRes.status).toBe(503);
      expect(submitRes.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(submitRes.body.error.message).toContain('Database service unavailable to verify file ownership');

      dbSpy.mockRestore();
    });

    it('9.2 should recover and allow submission once database is healthy again', async () => {
      // 1. With database restored, student submits the same uploaded file
      const submitRes = await request(app)
        .post(`/api/assignments/${phase53AssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Submitting after database recovery',
          submissionFileUrl: outageTestFileUrl,
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.status).toBe('success');
      expect(submitRes.body.data.submissionFileUrl).toBe(`/api/assignments/${phase53AssignmentId}/submission/file`);
    });

    it('9.3 should reject unknown file keys that do not exist in database or active references (fail-closed)', async () => {
      const submitRes = await request(app)
        .post(`/api/assignments/${phase53AssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Attempting submission with fabricated file key',
          submissionFileUrl: '/uploads/unknown-nonexistent-random-key-9999.pdf',
        });

      expect(submitRes.status).toBe(404);
      expect(submitRes.body.error.code).toBe('NOT_FOUND');
      expect(submitRes.body.error.message).toContain('Referenced upload file not found');
    });

    it('9.4 should reject submission if cached file belongs to a different user even before hitting database', async () => {
      const foreignKey = 'foreign-cached-key.pdf';
      FileStorage.uploadRegistry.set(foreignKey, {
        fileKey: foreignKey,
        originalName: 'foreign.pdf',
        sizeBytes: 1024,
        uploadedBy: DEV_FACULTY_USER_ID, // belongs to Faculty, not Student 1
        uploadedAt: new Date(),
        mimeType: 'application/pdf',
      });

      const submitRes = await request(app)
        .post(`/api/assignments/${phase53AssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Attempting cross-user cached attachment',
          submissionFileUrl: `/uploads/${foreignKey}`,
        });

      expect(submitRes.status).toBe(403);
      expect(submitRes.body.error.code).toBe('FORBIDDEN');
      expect(submitRes.body.error.message).toContain('not authorized to attach files uploaded by another user');

      FileStorage.uploadRegistry.delete(foreignKey);
    });

    it('9.5 should verify ownership after clearing in-memory cache when database is healthy', async () => {
      // 1. Student 1 uploads a file
      const codeBase64 = Buffer.from('print("Cache clear test")').toString('base64');
      const uploadRes = await request(app)
        .post('/api/assignments/upload')
        .set('Cookie', studentCookie)
        .send({
          fileName: 'cache_clear_script.py',
          fileData: codeBase64,
        });
      expect(uploadRes.status).toBe(200);
      const scriptUrl = uploadRes.body.data.fileUrl;

      // 2. Clear in-memory upload registry
      FileStorage.uploadRegistry.clear();
      expect(FileStorage.uploadRegistry.size).toBe(0);

      // 3. Student 2 tries to submit Student 1's file -> 403 Forbidden
      const unauthorizedRes = await request(app)
        .post(`/api/assignments/${phase53AssignmentId}/submit`)
        .set('Cookie', student2Cookie)
        .send({
          submissionText: 'Student 2 trying to claim Student 1 file after cache clear',
          submissionFileUrl: scriptUrl,
        });
      expect(unauthorizedRes.status).toBe(403);
      expect(unauthorizedRes.body.error.code).toBe('FORBIDDEN');

      // 4. Student 1 submits their own file -> succeeds authoritatively from PostgreSQL
      const authorizedRes = await request(app)
        .post(`/api/assignments/${phase53AssignmentId}/submit`)
        .set('Cookie', studentCookie)
        .send({
          submissionText: 'Student 1 submitting own file after cache clear',
          submissionFileUrl: scriptUrl,
        });
      expect(authorizedRes.status).toBe(200);
      expect(authorizedRes.body.status).toBe('success');
    });

    it('9.6 should enforce RBAC on file lifecycle cleanup endpoint', async () => {
      // Student cannot trigger cleanup
      const sRes = await request(app)
        .post('/api/assignments/cleanup')
        .set('Cookie', studentCookie)
        .send({});
      expect(sRes.status).toBe(403);

      // Faculty cannot trigger cleanup
      const fRes = await request(app)
        .post('/api/assignments/cleanup')
        .set('Cookie', facultyCookie)
        .send({});
      expect(fRes.status).toBe(403);

      // Registrar Admin can execute cleanup in dry-run mode
      const aRes = await request(app)
        .post('/api/assignments/cleanup')
        .set('Cookie', adminCookie)
        .send({ dryRun: true });
      expect(aRes.status).toBe(200);
      expect(aRes.body.status).toBe('success');
      expect(aRes.body.data).toHaveProperty('retainedActiveFiles');
      expect(aRes.body.data).toHaveProperty('scannedDbRecords');
    });

    it('9.7 should conservatively clean up orphaned files without deleting active submission files', async () => {
      const uploadDir = FileStorage.getUploadDirectory();
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

      // 1. Setup an abandoned old file on disk and in PostgreSQL (> 24h grace period)
      const orphanKey = `orphan_test_${Date.now()}.pdf`;
      const orphanPath = path.join(uploadDir, orphanKey);
      await fs.promises.writeFile(orphanPath, Buffer.from('%PDF-1.4 orphan old content'));
      await fs.promises.utimes(orphanPath, threeDaysAgo, threeDaysAgo);
      await prisma.uploadedFile.create({
        data: {
          fileKey: orphanKey,
          originalName: 'orphan_old.pdf',
          sizeBytes: 30,
          mimeType: 'application/pdf',
          uploadedById: DEV_STUDENT_USER_ID,
          createdAt: threeDaysAgo,
        },
      });

      // 2. Setup a missing physical record in PostgreSQL (> 24h grace period, file does NOT exist on disk)
      const missingPhysKey = `missing_phys_${Date.now()}.pdf`;
      await prisma.uploadedFile.create({
        data: {
          fileKey: missingPhysKey,
          originalName: 'missing_phys.pdf',
          sizeBytes: 100,
          mimeType: 'application/pdf',
          uploadedById: DEV_STUDENT_USER_ID,
          createdAt: threeDaysAgo,
        },
      });

      // 3. Setup an untracked disk file (> 24h grace period, no PostgreSQL record)
      const untrackedKey = `untracked_disk_${Date.now()}.pdf`;
      const untrackedPath = path.join(uploadDir, untrackedKey);
      await fs.promises.writeFile(untrackedPath, Buffer.from('%PDF-1.4 untracked content'));
      await fs.promises.utimes(untrackedPath, threeDaysAgo, threeDaysAgo);

      // 4. Setup a recent in-flight upload (< 24h grace period, unreferenced but actively drafting)
      const recentKey = `recent_inflight_${Date.now()}.pdf`;
      const recentPath = path.join(uploadDir, recentKey);
      await fs.promises.writeFile(recentPath, Buffer.from('%PDF-1.4 recent inflight content'));
      await prisma.uploadedFile.create({
        data: {
          fileKey: recentKey,
          originalName: 'recent_inflight.pdf',
          sizeBytes: 35,
          mimeType: 'application/pdf',
          uploadedById: DEV_STUDENT_USER_ID,
          createdAt: new Date(), // Now
        },
      });

      // 5. Execute conservative cleanup as Registrar Admin
      const cleanupRes = await request(app)
        .post('/api/assignments/cleanup')
        .set('Cookie', adminCookie)
        .send({ gracePeriodHours: 24, dryRun: false });

      expect(cleanupRes.status).toBe(200);
      expect(cleanupRes.body.data.deletedDiskFiles).toBeGreaterThanOrEqual(2);
      expect(cleanupRes.body.data.missingPhysicalRecordsPurged).toBeGreaterThanOrEqual(1);

      // 6. Verify assertions:
      // A: Orphan old file deleted from disk and DB
      expect(fs.existsSync(orphanPath)).toBe(false);
      const orphanDb = await prisma.uploadedFile.findUnique({ where: { fileKey: orphanKey } });
      expect(orphanDb).toBeNull();

      // B: Missing physical record purged from DB
      const missingDb = await prisma.uploadedFile.findUnique({ where: { fileKey: missingPhysKey } });
      expect(missingDb).toBeNull();

      // C: Untracked disk file deleted from disk
      expect(fs.existsSync(untrackedPath)).toBe(false);

      // D: Active submission files (e.g. from 9.2, 9.5, or earlier) MUST REMAIN INTACT!
      const activeSubs = await prisma.assignmentSubmission.findMany({
        where: { assignmentId: phase53AssignmentId, submissionFileUrl: { not: null } },
      });
      expect(activeSubs.length).toBeGreaterThanOrEqual(1);
      for (const sub of activeSubs) {
        if (sub.submissionFileUrl && !sub.submissionFileUrl.startsWith('http')) {
          const activeKey = path.basename(sub.submissionFileUrl);
          const activeDisk = path.join(uploadDir, activeKey);
          expect(fs.existsSync(activeDisk)).toBe(true);
        }
      }

      // E: Recent in-flight file MUST REMAIN INTACT (protected by 24h grace period)!
      expect(fs.existsSync(recentPath)).toBe(true);
      const recentDb = await prisma.uploadedFile.findUnique({ where: { fileKey: recentKey } });
      expect(recentDb).toBeDefined();

      // Clean up recent test file
      if (fs.existsSync(recentPath)) await fs.promises.unlink(recentPath);
      await prisma.uploadedFile.deleteMany({ where: { fileKey: recentKey } });
    });
  });
});
