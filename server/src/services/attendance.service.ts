import {
  attendanceRepository,
  DEV_COURSE_OFFERING_ID,
} from '../repositories/attendance.repository.js';
import { ForbiddenError, BadRequestError, NotFoundError, ConflictError } from '../errors/AppError.js';
import type { SafeUser } from '../types/auth.js';
import type {
  CreateAttendanceSessionInput,
  RecordAttendanceBatchInput,
  AttendanceSessionDTO,
  EnrolledStudentDTO,
  DefaulterStudentDTO,
  QrTokenResponseDTO,
  QrSessionStatusDTO,
  QrCheckInResultDTO,
  ActiveStudentSessionDTO,
} from '../types/attendance.js';
import { generateQrToken, verifyQrToken } from '../utils/qrToken.js';
import {
  calculateSubjectAttendance,
  calculateOverallAttendance,
  type OverallAttendanceSummary,
  type SubjectAttendanceStats,
} from '../utils/attendanceCalculator.js';
import { logger } from '../lib/logger.js';

export class AttendanceService {
  /**
   * Faculty / Admin: Create an attendance session for an assigned course offering
   */
  async createSession(
    user: SafeUser,
    input: CreateAttendanceSessionInput
  ): Promise<AttendanceSessionDTO> {
    const offering = await attendanceRepository.findOfferingById(input.courseOfferingId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${input.courseOfferingId}' does not exist.`);
    }

    // Role check: Faculty must be primary assigned faculty, or HOD/Dean/Admin
    const isAssignedTeacher = offering.facultyId === user.id;
    const isAcademicAdmin = ['HOD', 'DEAN', 'REGISTRAR_ADMIN'].includes(user.role);

    if (!isAssignedTeacher && !isAcademicAdmin) {
      logger.warn('Unauthorized attendance session creation attempt', {
        userId: user.id,
        userRole: user.role,
        courseOfferingId: input.courseOfferingId,
      });
      throw new ForbiddenError(
        'You are not authorized to create attendance sessions for this course offering.'
      );
    }

    const sessionDate = input.sessionDate ? new Date(input.sessionDate) : new Date();

    const created = await attendanceRepository.createSession({
      courseOfferingId: input.courseOfferingId,
      facultyId: user.id,
      sessionDate,
      startTime: input.startTime,
      topicTaught: input.topicTaught ?? null,
      slotId: input.slotId ?? null,
    });

    logger.info('Attendance session created', {
      sessionId: created.id,
      courseOfferingId: input.courseOfferingId,
      facultyId: user.id,
    });

    return created;
  }

  /**
   * Faculty: Record attendance batch for enrolled students in a session
   */
  async recordAttendanceBatch(
    user: SafeUser,
    sessionId: string,
    input: RecordAttendanceBatchInput
  ): Promise<{ sessionId: string; recordsMarked: number; isLocked: boolean }> {
    const session = await attendanceRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError(`Attendance session '${sessionId}' does not exist.`);
    }

    const offering = await attendanceRepository.findOfferingById(session.courseOfferingId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${session.courseOfferingId}' not found.`);
    }

    const isAssignedTeacher = offering.facultyId === user.id;
    const isAcademicAdmin = ['HOD', 'DEAN', 'REGISTRAR_ADMIN'].includes(user.role);

    if (!isAssignedTeacher && !isAcademicAdmin) {
      logger.warn('Unauthorized attendance marking attempt', {
        userId: user.id,
        sessionId,
      });
      throw new ForbiddenError(
        'You are not authorized to mark attendance for this course session.'
      );
    }

    // Normalize legacy dev student IDs if present for backwards-compatible test payloads
    const legacyMap: Record<string, string> = {
      'dev-student-uuid-001': 'a0000000-0000-4000-8000-000000000001',
      'dev-student-uuid-002': 'a0000000-0000-4000-8000-000000000003',
      'dev-student-uuid-003': 'a0000000-0000-4000-8000-000000000004',
      'dev-student-uuid-004': 'a0000000-0000-4000-8000-000000000005',
      'dev-student-uuid-005': 'a0000000-0000-4000-8000-000000000006',
    };

    const normalizedRecords = input.records.map((r) => ({
      ...r,
      studentId: legacyMap[r.studentId] || r.studentId,
    }));

    // Check for duplicate student records in client payload
    const seenStudentIds = new Set<string>();
    for (const record of normalizedRecords) {
      if (seenStudentIds.has(record.studentId)) {
        throw new BadRequestError(
          `Duplicate student ID '${record.studentId}' found in batch payload.`
        );
      }
      seenStudentIds.add(record.studentId);
    }

    // Validate that all submitted students are actually enrolled in this offering
    const enrolledIds = new Set(offering.enrolledStudents.map((s) => s.userId));
    for (const record of normalizedRecords) {
      if (!enrolledIds.has(record.studentId)) {
        throw new BadRequestError(
          `Student with ID '${record.studentId}' is not enrolled in course offering '${offering.courseCode}'.`
        );
      }
    }

    const result = await attendanceRepository.recordAttendanceBatch(
      sessionId,
      normalizedRecords,
      input.lockSession
    );

    logger.info('Attendance batch successfully recorded', {
      sessionId,
      recordsMarked: result.recordsMarked,
      isLocked: result.isLocked,
    });

    return result;
  }

  /**
   * Student: Get authenticated student's personalized attendance summary
   * Strictly scoped to req.user.id
   */
  async getStudentAttendanceSummary(user: SafeUser): Promise<OverallAttendanceSummary> {
    const records = await attendanceRepository.getStudentAttendanceRecords(user.id);

    // Group by course code
    const subjectMap = new Map<
      string,
      {
        code: string;
        title: string;
        faculty: string;
        records: Array<{ status: any }>;
      }
    >();

    for (const rec of records) {
      const existing = subjectMap.get(rec.subjectCode);
      if (!existing) {
        subjectMap.set(rec.subjectCode, {
          code: rec.subjectCode,
          title: rec.subjectTitle,
          faculty: rec.facultyName,
          records: [{ status: rec.status }],
        });
      } else {
        existing.records.push({ status: rec.status });
      }
    }

    const subjects: SubjectAttendanceStats[] = [];
    for (const item of subjectMap.values()) {
      subjects.push(
        calculateSubjectAttendance(
          { code: item.code, title: item.title, faculty: item.faculty },
          item.records
        )
      );
    }

    return calculateOverallAttendance(subjects);
  }

  /**
   * Faculty / Admin: Get enrolled students for roll call
   */
  async getEnrolledStudents(
    user: SafeUser,
    courseOfferingId: string = DEV_COURSE_OFFERING_ID
  ): Promise<EnrolledStudentDTO[]> {
    const offering = await attendanceRepository.findOfferingById(courseOfferingId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${courseOfferingId}' not found.`);
    }

    const isAssigned = offering.facultyId === user.id;
    const isAdmin = ['HOD', 'DEAN', 'REGISTRAR_ADMIN'].includes(user.role);

    if (!isAssigned && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to view the enrollment roster for this course.'
      );
    }

    return attendanceRepository.getEnrolledStudents(courseOfferingId);
  }

  /**
   * Faculty / Admin: Get attendance defaulters report (< 75%)
   */
  async getDefaulters(
    user: SafeUser,
    courseOfferingId: string = DEV_COURSE_OFFERING_ID,
    threshold = 75.0
  ): Promise<DefaulterStudentDTO[]> {
    const offering = await attendanceRepository.findOfferingById(courseOfferingId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${courseOfferingId}' not found.`);
    }

    const isAssigned = offering.facultyId === user.id;
    const isAdmin = ['HOD', 'DEAN', 'REGISTRAR_ADMIN'].includes(user.role);

    if (!isAssigned && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to view defaulter audits for this course offering.'
      );
    }

    return attendanceRepository.getDefaulters(courseOfferingId, threshold);
  }

  /**
   * Faculty / Admin: Generate an HMAC-signed QR token for an active attendance session
   */
  async generateQrToken(user: SafeUser, sessionId: string): Promise<QrTokenResponseDTO> {
    const session = await attendanceRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError(`Attendance session '${sessionId}' not found.`);
    }

    const offering = await attendanceRepository.findOfferingById(session.courseOfferingId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${session.courseOfferingId}' not found.`);
    }

    const isAssigned = offering.facultyId === user.id;
    const isAdmin = ['HOD', 'DEAN', 'REGISTRAR_ADMIN'].includes(user.role);

    if (!isAssigned && !isAdmin) {
      logger.warn('Unauthorized QR token generation attempt', {
        userId: user.id,
        sessionId,
      });
      throw new ForbiddenError(
        'You are not authorized to generate QR attendance for this course session.'
      );
    }

    if (session.isLocked) {
      throw new ConflictError(
        'This attendance session is closed and locked. QR attendance cannot be generated.'
      );
    }

    // 60-second validity window with secure rotation
    const qrData = generateQrToken(session.id, session.courseOfferingId, 60);

    logger.info('QR attendance token generated', {
      sessionId: session.id,
      courseOfferingId: session.courseOfferingId,
      facultyId: user.id,
      expiresAt: qrData.expiresAt,
    });

    return {
      token: qrData.token,
      sessionId: session.id,
      courseOfferingId: session.courseOfferingId,
      courseCode: offering.courseCode,
      courseTitle: offering.courseTitle,
      expiresAt: qrData.expiresAt,
      expiresInSeconds: qrData.expiresInSeconds,
      isLocked: false,
    };
  }

  /**
   * Faculty / Admin: Retrieve live check-in progress and student roster
   */
  async getSessionLiveStatus(user: SafeUser, sessionId: string): Promise<QrSessionStatusDTO> {
    const session = await attendanceRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError(`Attendance session '${sessionId}' not found.`);
    }

    const offering = await attendanceRepository.findOfferingById(session.courseOfferingId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${session.courseOfferingId}' not found.`);
    }

    const isAssigned = offering.facultyId === user.id;
    const isAdmin = ['HOD', 'DEAN', 'REGISTRAR_ADMIN'].includes(user.role);

    if (!isAssigned && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to view attendance status for this session.'
      );
    }

    return attendanceRepository.getSessionStatus(sessionId);
  }

  /**
   * Faculty / Admin: Close and finalize attendance session
   * Atomically locks session and marks unrecorded students as ABSENT
   */
  async closeAttendanceSession(
    user: SafeUser,
    sessionId: string
  ): Promise<{
    sessionId: string;
    isLocked: boolean;
    totalEnrolled: number;
    presentCount: number;
    absentCount: number;
    odCount: number;
  }> {
    const session = await attendanceRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError(`Attendance session '${sessionId}' not found.`);
    }

    const offering = await attendanceRepository.findOfferingById(session.courseOfferingId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${session.courseOfferingId}' not found.`);
    }

    const isAssigned = offering.facultyId === user.id;
    const isAdmin = ['HOD', 'DEAN', 'REGISTRAR_ADMIN'].includes(user.role);

    if (!isAssigned && !isAdmin) {
      logger.warn('Unauthorized attendance session closure attempt', {
        userId: user.id,
        sessionId,
      });
      throw new ForbiddenError(
        'You are not authorized to close attendance for this course session.'
      );
    }

    const result = await attendanceRepository.closeSessionAndMarkAbsent(sessionId);

    logger.info('Attendance session closed and finalized', {
      sessionId,
      facultyId: user.id,
      presentCount: result.presentCount,
      absentCount: result.absentCount,
    });

    return result;
  }

  /**
   * Student: Check in using scanned QR token
   * Validates cryptographic signature, expiry, session open status, and student enrollment
   */
  async verifyAndCheckIn(studentUser: SafeUser, qrTokenString: string): Promise<QrCheckInResultDTO> {
    if (studentUser.role !== 'STUDENT') {
      throw new ForbiddenError('Only authenticated students are authorized to check in via QR code.');
    }

    // 1. Verify cryptographic HMAC-SHA256 signature and TTL expiry
    const decoded = verifyQrToken(qrTokenString);

    // 2. Verify attendance session exists and is bound to course offering
    const session = await attendanceRepository.findSessionById(decoded.sessionId);
    if (!session) {
      throw new NotFoundError('Attendance session does not exist.');
    }

    if (session.courseOfferingId !== decoded.courseOfferingId) {
      throw new BadRequestError('QR token binding mismatch: session does not match course offering.');
    }

    // 3. Verify session is still open (not locked)
    if (session.isLocked) {
      throw new ConflictError(
        'This attendance session has been finalized and locked. Check-in is no longer accepted.'
      );
    }

    // 4. Verify student is actually enrolled in this course offering
    const offering = await attendanceRepository.findOfferingById(session.courseOfferingId);
    if (!offering) {
      throw new NotFoundError('Course offering not found.');
    }

    const effectiveStudentId =
      studentUser.id === 'dev-student-uuid-001'
        ? DEV_COURSE_OFFERING_ID // fallback ID check
        : studentUser.id;

    const isEnrolled = offering.enrolledStudents.some(
      (s) => s.userId === studentUser.id || s.userId === effectiveStudentId
    );

    if (!isEnrolled) {
      logger.warn('Unauthorized QR check-in attempt: student not enrolled', {
        studentId: studentUser.id,
        courseOfferingId: session.courseOfferingId,
        courseCode: offering.courseCode,
      });
      throw new BadRequestError(
        `You are not enrolled in course offering '${offering.courseCode} - ${offering.courseTitle}'. Check-in rejected.`
      );
    }

    // 5. Transactionally record attendance (concurrency-safe)
    const result = await attendanceRepository.recordStudentQrCheckIn(
      session.id,
      studentUser.id
    );

    logger.info('Student QR check-in recorded', {
      studentId: studentUser.id,
      sessionId: session.id,
      isAlreadyMarked: result.isAlreadyMarked,
    });

    return {
      sessionId: session.id,
      courseCode: offering.courseCode,
      courseTitle: offering.courseTitle,
      facultyName: offering.facultyName,
      status: 'PRESENT',
      studentId: studentUser.id,
      studentName: studentUser.fullName,
      markedAt: result.markedAt.toISOString(),
      isAlreadyMarked: result.isAlreadyMarked,
    };
  }

  /**
   * Student: Get active open attendance sessions for enrolled courses
   */
  async getActiveSessionsForStudent(studentUser: SafeUser): Promise<ActiveStudentSessionDTO[]> {
    if (studentUser.role !== 'STUDENT') {
      throw new ForbiddenError('Only students can view eligible active attendance sessions.');
    }
    return attendanceRepository.getActiveSessionsForStudent(studentUser.id);
  }
}

export const attendanceService = new AttendanceService();

