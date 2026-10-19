import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/env.js';
import { ServiceUnavailableError, NotFoundError, ConflictError } from '../errors/AppError.js';
import type { AttendanceStatus } from '@prisma/client';
import type {
  AttendanceSessionDTO,
  EnrolledStudentDTO,
  StudentAttendanceRecordItem,
  DefaulterStudentDTO,
} from '../types/attendance.js';
import { calculateSubjectAttendance } from '../utils/attendanceCalculator.js';

// Development fixture offering for testing and offline local dev
export const DEV_COURSE_OFFERING_ID = 'b0000000-0000-4000-8000-000000000001';
export const DEV_FACULTY_USER_ID = 'a0000000-0000-4000-8000-000000000002';
export const DEV_STUDENT_USER_ID = 'a0000000-0000-4000-8000-000000000001';

interface DevOfferingData {
  id: string;
  courseCode: string;
  courseTitle: string;
  facultyId: string;
  facultyName: string;
  enrolledStudents: Array<{
    userId: string;
    profileId: string;
    rollNumber: string;
    registrationNo: string;
    fullName: string;
  }>;
}

interface DevSessionRecord {
  id: string;
  courseOfferingId: string;
  facultyId: string;
  sessionDate: Date;
  startTime: string;
  topicTaught: string | null;
  markedAt: Date;
  isLocked: boolean;
  records: Map<string, { status: AttendanceStatus; remarks?: string | null; updatedAt: Date }>;
}

// In-memory dev/test fixtures
let devOfferings: Map<string, DevOfferingData> = new Map();
let devSessions: Map<string, DevSessionRecord> = new Map();

function initDevFixtures(): void {
  const student2Id = 'a0000000-0000-4000-8000-000000000003';
  const student3Id = 'a0000000-0000-4000-8000-000000000004';
  const student4Id = 'a0000000-0000-4000-8000-000000000005';
  const student5Id = 'a0000000-0000-4000-8000-000000000006';

  const offeringData: DevOfferingData = {
    id: DEV_COURSE_OFFERING_ID,
    courseCode: 'CS302',
    courseTitle: 'Design & Analysis of Algorithms',
    facultyId: DEV_FACULTY_USER_ID,
    facultyName: 'Dr. Rajesh Sharma (Dev Fixture)',
    enrolledStudents: [
      {
        userId: DEV_STUDENT_USER_ID,
        profileId: 'a0000000-0000-4000-8000-000000000001',
        rollNumber: '0251BTCS097',
        registrationNo: 'DBS25UG25234',
        fullName: 'Harendra Pratap Singh (Dev Fixture)',
      },
      {
        userId: student2Id,
        profileId: student2Id,
        rollNumber: '0251BTCS001',
        registrationNo: 'DBS25UG25001',
        fullName: 'Aaditya Sharma',
      },
      {
        userId: student3Id,
        profileId: student3Id,
        rollNumber: '0251BTCS014',
        registrationNo: 'DBS25UG25014',
        fullName: 'Aman Deep Singh',
      },
      {
        userId: student4Id,
        profileId: student4Id,
        rollNumber: '0251BTCS051',
        registrationNo: 'DBS25UG25051',
        fullName: 'Isha Bahuguna',
      },
      {
        userId: student5Id,
        profileId: student5Id,
        rollNumber: '0251BTCS089',
        registrationNo: 'DBS25UG25089',
        fullName: 'Naveen Bhatt',
      },
    ],
  };

  devOfferings = new Map([
    [DEV_COURSE_OFFERING_ID, offeringData],
    ['dev-offering-cs302-001', offeringData],
  ]);

  // Seed baseline sessions for CS302 so student has realistic initial attendance history
  const baselineSessionId1 = 'c0000000-0000-4000-8000-000000000001';
  const baselineSessionId2 = 'c0000000-0000-4000-8000-000000000002';

  devSessions = new Map([
    [
      baselineSessionId1,
      {
        id: baselineSessionId1,
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        facultyId: DEV_FACULTY_USER_ID,
        sessionDate: new Date('2026-10-10T10:00:00Z'),
        startTime: '10:00 AM',
        topicTaught: 'Divide & Conquer: Master Theorem Proof',
        markedAt: new Date('2026-10-10T11:00:00Z'),
        isLocked: true,
        records: new Map([
          [DEV_STUDENT_USER_ID, { status: 'PRESENT', updatedAt: new Date() }],
          [student2Id, { status: 'PRESENT', updatedAt: new Date() }],
          [student3Id, { status: 'ABSENT', updatedAt: new Date() }],
          [student4Id, { status: 'ABSENT', updatedAt: new Date() }],
          [student5Id, { status: 'ABSENT', updatedAt: new Date() }],
        ]),
      },
    ],
    [
      baselineSessionId2,
      {
        id: baselineSessionId2,
        courseOfferingId: DEV_COURSE_OFFERING_ID,
        facultyId: DEV_FACULTY_USER_ID,
        sessionDate: new Date('2026-10-12T10:00:00Z'),
        startTime: '10:00 AM',
        topicTaught: 'Greedy Algorithms: Huffman Coding',
        markedAt: new Date('2026-10-12T11:00:00Z'),
        isLocked: true,
        records: new Map([
          [DEV_STUDENT_USER_ID, { status: 'ON_DUTY', remarks: 'Smart India Hackathon', updatedAt: new Date() }],
          [student2Id, { status: 'PRESENT', updatedAt: new Date() }],
          [student3Id, { status: 'ABSENT', updatedAt: new Date() }],
          [student4Id, { status: 'ABSENT', updatedAt: new Date() }],
          [student5Id, { status: 'ABSENT', updatedAt: new Date() }],
        ]),
      },
    ],
  ]);
}

initDevFixtures();

export class AttendanceRepository {
  /**
   * Find course offering with course and teacher information
   */
  async findOfferingById(offeringId: string): Promise<DevOfferingData | null> {
    const effectiveOfferingId =
      offeringId === 'dev-offering-cs302-001' ? DEV_COURSE_OFFERING_ID : offeringId;

    let dbError: unknown = null;
    try {
      const offering = await prisma.courseOffering.findUnique({
        where: { id: effectiveOfferingId },
        include: {
          course: true,
          primaryFaculty: true,
          enrollments: {
            include: {
              student: {
                include: { studentProfile: true },
              },
            },
          },
        },
      });

      if (offering) {
        return {
          id: offering.id,
          courseCode: offering.course.code,
          courseTitle: offering.course.title,
          facultyId: offering.primaryFacultyId,
          facultyName: offering.primaryFaculty.fullName,
          enrolledStudents: offering.enrollments.map((e) => ({
            userId: e.student.id,
            profileId: e.student.studentProfile?.id ?? e.student.id,
            rollNumber: e.student.studentProfile?.rollNumber ?? 'UNASSIGNED',
            registrationNo: e.student.studentProfile?.registrationNo ?? 'UNASSIGNED',
            fullName: e.student.fullName,
          })),
        };
      }
    } catch (err) {
      dbError = err;
    }

    if (config.NODE_ENV === 'production') {
      if (dbError) throw new ServiceUnavailableError('Database service unavailable in production');
      return null;
    }

    return devOfferings.get(effectiveOfferingId) ?? devOfferings.get(offeringId) ?? null;
  }

  /**
   * Returns list of students currently enrolled in the given course offering
   */
  async getEnrolledStudents(offeringId: string): Promise<EnrolledStudentDTO[]> {
    const offering = await this.findOfferingById(offeringId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${offeringId}' not found.`);
    }

    const effectiveOfferingId = offering.id;

    // 1. Attempt PostgreSQL live query
    try {
      const dbSessions = await prisma.attendanceSession.findMany({
        where: { courseOfferingId: effectiveOfferingId },
        include: { records: true },
      });

      const result: EnrolledStudentDTO[] = [];
      for (const student of offering.enrolledStudents) {
        let attended = 0;
        let conducted = 0;

        for (const sess of dbSessions) {
          const rec = sess.records.find((r) => r.studentId === student.userId);
          if (rec) {
            conducted += 1;
            if (['PRESENT', 'ON_DUTY', 'MEDICAL_LEAVE', 'EXEMPTED'].includes(rec.status)) {
              attended += 1;
            }
          }
        }

        const percent = conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 100.0;
        result.push({
          studentUserId: student.userId,
          studentProfileId: student.profileId,
          rollNumber: student.rollNumber,
          registrationNo: student.registrationNo,
          fullName: student.fullName,
          currentAttendancePercent: percent,
        });
      }

      return result;
    } catch (err) {
      logger.warn('attendance.repository: live query failed:', err);
    }

    if (config.NODE_ENV === 'production') {
      throw new ServiceUnavailableError('Database service unavailable in production');
    }

    // 2. Dev fixture fallback if PostgreSQL was offline
    const result: EnrolledStudentDTO[] = [];
    for (const student of offering.enrolledStudents) {
      let attended = 0;
      let conducted = 0;

      for (const sess of devSessions.values()) {
        if (sess.courseOfferingId === effectiveOfferingId) {
          const rec = sess.records.get(student.userId);
          if (rec) {
            conducted += 1;
            if (['PRESENT', 'ON_DUTY', 'MEDICAL_LEAVE', 'EXEMPTED'].includes(rec.status)) {
              attended += 1;
            }
          }
        }
      }

      const percent = conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 100.0;
      result.push({
        studentUserId: student.userId,
        studentProfileId: student.profileId,
        rollNumber: student.rollNumber,
        registrationNo: student.registrationNo,
        fullName: student.fullName,
        currentAttendancePercent: percent,
      });
    }

    return result;
  }

  /**
   * Creates an attendance session record
   */
  async createSession(params: {
    courseOfferingId: string;
    facultyId: string;
    sessionDate: Date;
    startTime: string;
    topicTaught?: string | null;
    slotId?: string | null;
  }): Promise<AttendanceSessionDTO> {
    const offering = await this.findOfferingById(params.courseOfferingId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${params.courseOfferingId}' does not exist.`);
    }

    const effectiveOfferingId =
      params.courseOfferingId === 'dev-offering-cs302-001'
        ? DEV_COURSE_OFFERING_ID
        : params.courseOfferingId;
    const effectiveFacultyId =
      params.facultyId === 'dev-faculty-uuid-002'
        ? DEV_FACULTY_USER_ID
        : params.facultyId;

    try {
      const dbSession = await prisma.attendanceSession.create({
        data: {
          courseOfferingId: effectiveOfferingId,
          facultyId: effectiveFacultyId,
          sessionDate: params.sessionDate,
          startTime: params.startTime,
          topicTaught: params.topicTaught ?? null,
          slotId: params.slotId ?? null,
        },
        include: {
          courseOffering: { include: { course: true } },
          faculty: true,
        },
      });

      return {
        id: dbSession.id,
        courseOfferingId: dbSession.courseOfferingId,
        courseCode: dbSession.courseOffering.course.code,
        courseTitle: dbSession.courseOffering.course.title,
        facultyId: dbSession.facultyId,
        facultyName: dbSession.faculty.fullName,
        sessionDate: dbSession.sessionDate,
        startTime: dbSession.startTime,
        topicTaught: dbSession.topicTaught,
        markedAt: dbSession.markedAt,
        isLocked: dbSession.isLocked,
        totalRecordsMarked: 0,
      };
    } catch (err) {
      logger.warn('attendance.repository: PostgreSQL createSession failed, checking non-production fallback:', err);
    }

    if (config.NODE_ENV === 'production') {
      throw new ServiceUnavailableError('Database service unavailable in production');
    }

    // Dev fallback session
    const sessionId = crypto.randomUUID();
    const devRecord: DevSessionRecord = {
      id: sessionId,
      courseOfferingId: params.courseOfferingId,
      facultyId: params.facultyId,
      sessionDate: params.sessionDate,
      startTime: params.startTime,
      topicTaught: params.topicTaught ?? null,
      markedAt: new Date(),
      isLocked: false,
      records: new Map(),
    };
    devSessions.set(sessionId, devRecord);

    return {
      id: sessionId,
      courseOfferingId: params.courseOfferingId,
      courseCode: offering.courseCode,
      courseTitle: offering.courseTitle,
      facultyId: params.facultyId,
      facultyName: offering.facultyName,
      sessionDate: params.sessionDate,
      startTime: params.startTime,
      topicTaught: params.topicTaught,
      markedAt: devRecord.markedAt,
      isLocked: false,
      totalRecordsMarked: 0,
    };
  }

  /**
   * Find an existing attendance session by its ID
   */
  async findSessionById(sessionId: string): Promise<DevSessionRecord | null> {
    let dbError: unknown = null;
    try {
      const dbSession = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          records: true,
        },
      });

      if (dbSession) {
        const recordMap = new Map<string, { status: AttendanceStatus; remarks?: string | null; updatedAt: Date }>();
        for (const r of dbSession.records) {
          recordMap.set(r.studentId, {
            status: r.status,
            remarks: r.remarks,
            updatedAt: r.updatedAt,
          });
        }
        return {
          id: dbSession.id,
          courseOfferingId: dbSession.courseOfferingId,
          facultyId: dbSession.facultyId,
          sessionDate: dbSession.sessionDate,
          startTime: dbSession.startTime,
          topicTaught: dbSession.topicTaught,
          markedAt: dbSession.markedAt,
          isLocked: dbSession.isLocked,
          records: recordMap,
        };
      }
    } catch (err) {
      dbError = err;
    }

    if (config.NODE_ENV === 'production') {
      if (dbError) throw new ServiceUnavailableError('Database service unavailable in production');
      return null;
    }

    return devSessions.get(sessionId) ?? null;
  }

  /**
   * Record attendance records transactionally in batch
   */
  async recordAttendanceBatch(
    sessionId: string,
    records: StudentAttendanceRecordItem[],
    lockSession = false
  ): Promise<{ sessionId: string; recordsMarked: number; isLocked: boolean }> {
    const session = await this.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError(`Attendance session '${sessionId}' does not exist.`);
    }

    if (session.isLocked) {
      throw new ConflictError(
        'This attendance session has been finalized and locked. Changes require HOD authorization.'
      );
    }

    try {
      // Execute in PostgreSQL transaction
      await prisma.$transaction(async (tx) => {
        for (const item of records) {
          const effectiveStudentId =
            item.studentId === 'dev-student-uuid-001'
              ? DEV_STUDENT_USER_ID
              : item.studentId;

          await tx.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId,
                studentId: effectiveStudentId,
              },
            },
            create: {
              sessionId,
              studentId: effectiveStudentId,
              status: item.status,
              remarks: item.remarks ?? null,
            },
            update: {
              status: item.status,
              remarks: item.remarks ?? null,
              updatedAt: new Date(),
            },
          });
        }

        if (lockSession) {
          await tx.attendanceSession.update({
            where: { id: sessionId },
            data: { isLocked: true },
          });
        }
      });

      return {
        sessionId,
        recordsMarked: records.length,
        isLocked: lockSession,
      };
    } catch (err) {
      logger.warn('attendance.repository: PostgreSQL recordAttendanceBatch transaction failed, checking non-production fallback:', err);
    }

    if (config.NODE_ENV === 'production') {
      throw new ServiceUnavailableError('Database service unavailable in production');
    }

    // Dev fallback batch write
    for (const item of records) {
      session.records.set(item.studentId, {
        status: item.status,
        remarks: item.remarks ?? null,
        updatedAt: new Date(),
      });
    }
    if (lockSession) {
      session.isLocked = true;
    }

    return {
      sessionId,
      recordsMarked: records.length,
      isLocked: session.isLocked,
    };
  }

  /**
   * Retrieves all attendance records for a student across all subjects
   */
  async getStudentAttendanceRecords(studentUserId: string): Promise<
    Array<{
      subjectCode: string;
      subjectTitle: string;
      facultyName: string;
      status: AttendanceStatus;
      sessionDate: Date;
    }>
  > {
    let dbError: unknown = null;
    try {
      const records = await prisma.attendanceRecord.findMany({
        where: { studentId: studentUserId },
        include: {
          session: {
            include: {
              courseOffering: {
                include: {
                  course: true,
                  primaryFaculty: true,
                },
              },
            },
          },
        },
        orderBy: { session: { sessionDate: 'asc' } },
      });

      return records.map((r) => ({
        subjectCode: r.session.courseOffering.course.code,
        subjectTitle: r.session.courseOffering.course.title,
        facultyName: r.session.courseOffering.primaryFaculty.fullName,
        status: r.status,
        sessionDate: r.session.sessionDate,
      }));
    } catch (err) {
      dbError = err;
    }

    if (config.NODE_ENV === 'production') {
      if (dbError) throw new ServiceUnavailableError('Database service unavailable in production');
      return [];
    }

    // Dev fallback: collect records across devSessions for this student
    const result: Array<{
      subjectCode: string;
      subjectTitle: string;
      facultyName: string;
      status: AttendanceStatus;
      sessionDate: Date;
    }> = [];

    for (const sess of devSessions.values()) {
      const rec = sess.records.get(studentUserId);
      if (rec) {
        const offering = devOfferings.get(sess.courseOfferingId);
        result.push({
          subjectCode: offering?.courseCode ?? 'CS302',
          subjectTitle: offering?.courseTitle ?? 'Design & Analysis of Algorithms',
          facultyName: offering?.facultyName ?? 'Dr. Rajesh Sharma',
          status: rec.status,
          sessionDate: sess.sessionDate,
        });
      }
    }

    return result;
  }

  /**
   * Retrieves defaulter list (< 75% attendance) for a course offering
   */
  async getDefaulters(offeringId: string, thresholdPercent = 75.0): Promise<DefaulterStudentDTO[]> {
    const offering = await this.findOfferingById(offeringId);
    if (!offering) {
      throw new NotFoundError(`Course offering '${offeringId}' not found.`);
    }

    const effectiveOfferingId = offering.id;

    // 1. Attempt PostgreSQL live query
    try {
      const dbSessions = await prisma.attendanceSession.findMany({
        where: { courseOfferingId: effectiveOfferingId },
        include: { records: true },
      });

      const defaulters: DefaulterStudentDTO[] = [];
      for (const student of offering.enrolledStudents) {
        const recordsForStudent: Array<{ status: AttendanceStatus }> = [];

        for (const sess of dbSessions) {
          const rec = sess.records.find((r) => r.studentId === student.userId);
          if (rec) {
            recordsForStudent.push({ status: rec.status });
          }
        }

        const stats = calculateSubjectAttendance(
          { code: offering.courseCode, title: offering.courseTitle, faculty: offering.facultyName },
          recordsForStudent
        );

        if (stats.conducted > 0 && stats.percentage < thresholdPercent) {
          defaulters.push({
            studentUserId: student.userId,
            rollNumber: student.rollNumber,
            fullName: student.fullName,
            attended: stats.attended,
            conducted: stats.conducted,
            percentage: stats.percentage,
            status: stats.status === 'danger' ? 'danger' : 'warning',
            isDebarred: stats.percentage < 65.0,
          });
        }
      }

      return defaulters;
    } catch (err) {
      logger.warn('attendance.repository: PostgreSQL getDefaulters query failed, checking fallback:', err);
    }

    if (config.NODE_ENV === 'production') {
      throw new ServiceUnavailableError('Database service unavailable in production');
    }

    // 2. Dev fixture fallback if PostgreSQL was offline
    const defaulters: DefaulterStudentDTO[] = [];

    for (const student of offering.enrolledStudents) {
      const recordsForStudent: Array<{ status: AttendanceStatus }> = [];

      for (const sess of devSessions.values()) {
        if (sess.courseOfferingId === effectiveOfferingId) {
          const rec = sess.records.get(student.userId);
          if (rec) {
            recordsForStudent.push({ status: rec.status });
          }
        }
      }

      const stats = calculateSubjectAttendance(
        { code: offering.courseCode, title: offering.courseTitle, faculty: offering.facultyName },
        recordsForStudent
      );

      if (stats.conducted > 0 && stats.percentage < thresholdPercent) {
        defaulters.push({
          studentUserId: student.userId,
          rollNumber: student.rollNumber,
          fullName: student.fullName,
          attended: stats.attended,
          conducted: stats.conducted,
          percentage: stats.percentage,
          status: stats.status === 'danger' ? 'danger' : 'warning',
          isDebarred: stats.percentage < 65.0,
        });
      }
    }

    return defaulters;
  }

  /**
   * Resets dev fixtures for unit test isolation
   */
  clearDevStore(): void {
    initDevFixtures();
  }
}

export const attendanceRepository = new AttendanceRepository();
