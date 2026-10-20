import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../errors/AppError.js';
import type { Prisma } from '@prisma/client';

export class AcademicRepository {
  async getDepartments() {
    return prisma.department.findMany({
      include: {
        programs: true,
        _count: {
          select: {
            facultyProfiles: true,
            courses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getPrograms() {
    return prisma.program.findMany({
      include: {
        department: true,
        batches: {
          include: {
            sections: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCourses(filters?: { departmentId?: string; search?: string }) {
    const where: Prisma.CourseWhereInput = {};
    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }
    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.course.findMany({
      where,
      include: {
        department: true,
        _count: {
          select: { offerings: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createCourse(data: {
    departmentId: string;
    code: string;
    title: string;
    credits: number;
    lectureHours: number;
    tutorialHours: number;
    practicalHours: number;
    syllabusDocUrl?: string;
  }) {
    return prisma.course.create({
      data,
      include: {
        department: true,
      },
    });
  }

  async getOfferings(filters?: { academicYear?: string; semester?: number; departmentId?: string }) {
    const where: Prisma.CourseOfferingWhereInput = {};
    if (filters?.academicYear) {
      where.academicYear = filters.academicYear;
    }
    if (filters?.semester) {
      where.semester = filters.semester;
    }
    if (filters?.departmentId) {
      where.course = { departmentId: filters.departmentId };
    }
    return prisma.courseOffering.findMany({
      where,
      include: {
        course: {
          include: { department: true },
        },
        section: {
          include: { batch: { include: { program: true } } },
        },
        primaryFaculty: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            sessions: true,
          },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { semester: 'desc' }],
    });
  }

  async createOffering(data: {
    courseId: string;
    sectionId: string;
    primaryFacultyId: string;
    academicYear: string;
    semester: number;
  }) {
    return prisma.courseOffering.create({
      data,
      include: {
        course: true,
        section: true,
        primaryFaculty: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async enrollStudent(studentId: string, courseOfferingId: string) {
    return prisma.enrollment.create({
      data: {
        studentId,
        courseOfferingId,
      },
      include: {
        student: {
          select: { id: true, fullName: true, email: true },
        },
        courseOffering: {
          include: { course: true },
        },
      },
    });
  }

  async dropEnrollment(enrollmentId: string) {
    return prisma.enrollment.delete({
      where: { id: enrollmentId },
    });
  }

  async correctAttendanceRecord(params: {
    attendanceRecordId: string;
    newStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    reason: string;
    approvalRef?: string;
    performedById: string;
    ipAddress?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceRecord.findUnique({
        where: { id: params.attendanceRecordId },
        include: {
          student: true,
          session: {
            include: { courseOffering: { include: { course: true } } },
          },
        },
      });

      if (!existing) {
        throw new NotFoundError('Attendance record not found');
      }

      const previousStatus = existing.status;

      const updated = await tx.attendanceRecord.update({
        where: { id: params.attendanceRecordId },
        data: {
          status: params.newStatus,
          remarks: `[Corrected by Admin] Previous: ${previousStatus}. Reason: ${params.reason}`,
        },
      });

      const auditLog = await tx.academicCorrectionLog.create({
        data: {
          studentId: existing.studentId,
          performedById: params.performedById,
          targetEntity: 'ATTENDANCE_RECORD',
          entityId: params.attendanceRecordId,
          reason: params.reason,
          previousState: { status: previousStatus, remarks: existing.remarks },
          newState: { status: params.newStatus, remarks: updated.remarks },
          approvalRef: params.approvalRef || null,
          ipAddress: params.ipAddress || null,
        },
      });

      return { updated, auditLog };
    });
  }

  async correctStudentEnrollmentStatus(params: {
    studentId: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN' | 'GRADUATED';
    reason: string;
    approvalRef?: string;
    performedById: string;
    ipAddress?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: params.studentId },
        include: { studentProfile: true },
      });

      if (!user) {
        throw new NotFoundError('Student user not found');
      }

      const previousActive = user.isActive;
      const willBeActive = params.status === 'ACTIVE';

      const updatedUser = await tx.user.update({
        where: { id: params.studentId },
        data: {
          isActive: willBeActive,
        },
      });

      const auditLog = await tx.academicCorrectionLog.create({
        data: {
          studentId: params.studentId,
          performedById: params.performedById,
          targetEntity: 'ENROLLMENT_STATUS',
          entityId: user.studentProfile?.id || params.studentId,
          reason: params.reason,
          previousState: { isActive: previousActive },
          newState: { status: params.status, isActive: willBeActive },
          approvalRef: params.approvalRef || null,
          ipAddress: params.ipAddress || null,
        },
      });

      return { updatedUser, auditLog };
    });
  }

  async getCorrectionLogs(filters?: { studentId?: string; targetEntity?: string; limit?: number }) {
    const where: Prisma.AcademicCorrectionLogWhereInput = {};
    if (filters?.studentId) where.studentId = filters.studentId;
    if (filters?.targetEntity) where.targetEntity = filters.targetEntity;

    return prisma.academicCorrectionLog.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        performedBy: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    });
  }
}

export const academicRepository = new AcademicRepository();
