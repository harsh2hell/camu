import {
  attendanceRepository,
  DEV_COURSE_OFFERING_ID,
} from '../repositories/attendance.repository.js';
import { ForbiddenError, BadRequestError, NotFoundError } from '../errors/AppError.js';
import type { SafeUser } from '../types/auth.js';
import type {
  CreateAttendanceSessionInput,
  RecordAttendanceBatchInput,
  AttendanceSessionDTO,
  EnrolledStudentDTO,
  DefaulterStudentDTO,
} from '../types/attendance.js';
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

    // Check for duplicate student records in client payload
    const seenStudentIds = new Set<string>();
    for (const record of input.records) {
      if (seenStudentIds.has(record.studentId)) {
        throw new BadRequestError(
          `Duplicate student ID '${record.studentId}' found in batch payload.`
        );
      }
      seenStudentIds.add(record.studentId);
    }

    // Validate that all submitted students are actually enrolled in this offering
    const enrolledIds = new Set(offering.enrolledStudents.map((s) => s.userId));
    for (const record of input.records) {
      if (!enrolledIds.has(record.studentId)) {
        throw new BadRequestError(
          `Student with ID '${record.studentId}' is not enrolled in course offering '${offering.courseCode}'.`
        );
      }
    }

    const result = await attendanceRepository.recordAttendanceBatch(
      sessionId,
      input.records,
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
}

export const attendanceService = new AttendanceService();
