import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../errors/AppError.js';

export class DepartmentRepository {
  async getDepartmentById(departmentId: string) {
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        programs: true,
        _count: {
          select: {
            faculty: true,
            courses: true,
          },
        },
      },
    });
    if (!dept) throw new NotFoundError('Department not found');
    return dept;
  }

  async getFacultyProfileByUserId(userId: string) {
    return prisma.facultyProfile.findUnique({
      where: { userId },
      include: { department: true },
    });
  }

  async getDepartmentOverview(departmentId: string) {
    const department = await this.getDepartmentById(departmentId);

    const facultyCount = await prisma.facultyProfile.count({
      where: { departmentId },
    });

    const coursesCount = await prisma.course.count({
      where: { departmentId },
    });

    const activeOfferingsCount = await prisma.courseOffering.count({
      where: {
        course: { departmentId },
        isActive: true,
      },
    });

    // Students in this department's programs
    const studentsCount = await prisma.studentProfile.count({
      where: {
        batch: {
          program: {
            departmentId,
          },
        },
      },
    });

    // Recent assignments
    const assignmentsCount = await prisma.assignment.count({
      where: {
        courseOffering: {
          course: { departmentId },
        },
      },
    });

    return {
      department,
      stats: {
        facultyCount,
        coursesCount,
        activeOfferingsCount,
        studentsCount,
        assignmentsCount,
      },
    };
  }

  async getDepartmentFaculty(departmentId: string) {
    return prisma.facultyProfile.findMany({
      where: { departmentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { employeeCode: 'asc' },
    });
  }

  async getDepartmentStudents(departmentId: string) {
    return prisma.studentProfile.findMany({
      where: {
        batch: {
          program: {
            departmentId,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        batch: {
          include: {
            program: true,
          },
        },
        section: true,
      },
      orderBy: { rollNumber: 'asc' },
    });
  }

  async getCourseAllocations(departmentId: string) {
    return prisma.courseOffering.findMany({
      where: {
        course: { departmentId },
      },
      include: {
        course: true,
        section: {
          include: {
            batch: {
              include: { program: true },
            },
          },
        },
        primaryFaculty: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        timetableSlots: true,
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

  async getAttendanceComplianceReport(departmentId: string, threshold: number = 75) {
    // Find all course offerings in this department
    const offerings = await prisma.courseOffering.findMany({
      where: { course: { departmentId } },
      select: { id: true, course: { select: { code: true, title: true } } },
    });

    const offeringIds = offerings.map((o) => o.id);
    if (offeringIds.length === 0) {
      return { totalOfferings: 0, defaulters: [], overallComplianceRate: 100 };
    }

    // Get attendance records for sessions in these offerings
    const records = await prisma.attendanceRecord.findMany({
      where: {
        session: {
          courseOfferingId: { in: offeringIds },
        },
      },
      select: {
        studentId: true,
        status: true,
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            studentProfile: {
              select: { rollNumber: true },
            },
          },
        },
        session: {
          select: {
            courseOfferingId: true,
            courseOffering: {
              select: { course: { select: { code: true, title: true } } },
            },
          },
        },
      },
    });

    // Aggregate by student and course
    const studentAggregates = new Map<
      string,
      {
        studentId: string;
        fullName: string;
        rollNumber: string;
        courseCode: string;
        courseTitle: string;
        total: number;
        attended: number;
      }
    >();

    for (const rec of records) {
      const key = `${rec.studentId}_${rec.session.courseOfferingId}`;
      let agg = studentAggregates.get(key);
      if (!agg) {
        agg = {
          studentId: rec.studentId,
          fullName: rec.student.fullName,
          rollNumber: rec.student.studentProfile?.rollNumber || 'N/A',
          courseCode: rec.session.courseOffering.course.code,
          courseTitle: rec.session.courseOffering.course.title,
          total: 0,
          attended: 0,
        };
        studentAggregates.set(key, agg);
      }
      agg.total += 1;
      if (rec.status === 'PRESENT' || rec.status === 'LATE') {
        agg.attended += 1;
      }
    }

    const defaulters: Array<{
      studentId: string;
      fullName: string;
      rollNumber: string;
      courseCode: string;
      courseTitle: string;
      totalSessions: number;
      attendedSessions: number;
      attendancePercentage: number;
      status: 'CRITICAL' | 'WARNING';
    }> = [];

    let totalAttendancePercentageSum = 0;
    let aggregateCount = 0;

    for (const agg of studentAggregates.values()) {
      if (agg.total > 0) {
        const pct = Math.round((agg.attended / agg.total) * 100 * 10) / 10;
        totalAttendancePercentageSum += pct;
        aggregateCount += 1;

        if (pct < threshold) {
          defaulters.push({
            studentId: agg.studentId,
            fullName: agg.fullName,
            rollNumber: agg.rollNumber,
            courseCode: agg.courseCode,
            courseTitle: agg.courseTitle,
            totalSessions: agg.total,
            attendedSessions: agg.attended,
            attendancePercentage: pct,
            status: pct < 50 ? 'CRITICAL' : 'WARNING',
          });
        }
      }
    }

    const overallComplianceRate =
      aggregateCount > 0 ? Math.round((totalAttendancePercentageSum / aggregateCount) * 10) / 10 : 100;

    return {
      totalOfferings: offeringIds.length,
      evaluatedStudentCourses: aggregateCount,
      defaulterCount: defaulters.length,
      overallComplianceRate,
      threshold,
      defaulters: defaulters.sort((a, b) => a.attendancePercentage - b.attendancePercentage),
    };
  }
}

export const departmentRepository = new DepartmentRepository();
