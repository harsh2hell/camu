import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/env.js';
import { ServiceUnavailableError } from '../errors/AppError.js';
import type { DayOfWeek } from '@prisma/client';
import type { TimetableSlotDTO } from '../types/timetable.js';

// Development Fixtures for Offline Dev Fallback
const DEV_STUDENT_USER_ID = 'a0000000-0000-4000-8000-000000000001';
const DEV_FACULTY_USER_ID = 'a0000000-0000-4000-8000-000000000002';
const DEV_OFFERING_ID = 'b0000000-0000-4000-8000-000000000001';

const MOCK_FIXTURE_SLOTS: TimetableSlotDTO[] = [
  {
    id: 'f0000001-0000-4000-8000-000000000001',
    courseOfferingId: DEV_OFFERING_ID,
    courseCode: 'CS302',
    courseTitle: 'Design & Analysis of Algorithms',
    facultyId: DEV_FACULTY_USER_ID,
    facultyName: 'Dr. Rajesh Sharma',
    dayName: 'MONDAY',
    startTime: '09:00 AM',
    endTime: '09:55 AM',
    timeRange: '09:00 - 09:55 AM',
    roomNumber: 'LT-204 (Block 1)',
    isLab: false,
    note: null,
    academicYear: '2026-27',
    semester: 3,
    sectionName: 'Section A',
  },
  {
    id: 'f0000001-0000-4000-8000-000000000002',
    courseOfferingId: DEV_OFFERING_ID,
    courseCode: 'CS302-L',
    courseTitle: 'Algorithms Lab (Batch A1)',
    facultyId: DEV_FACULTY_USER_ID,
    facultyName: 'Dr. Rajesh Sharma & TA',
    dayName: 'MONDAY',
    startTime: '11:15 AM',
    endTime: '01:05 PM',
    timeRange: '11:15 - 01:05 PM',
    roomNumber: 'Computing Lab 3 (Block 2)',
    isLab: true,
    note: 'Carry your Dynamic Programming assignment sheets',
    academicYear: '2026-27',
    semester: 3,
    sectionName: 'Section A',
  },
  {
    id: 'f0000001-0000-4000-8000-000000000003',
    courseOfferingId: DEV_OFFERING_ID,
    courseCode: 'CS302',
    courseTitle: 'Design & Analysis of Algorithms',
    facultyId: DEV_FACULTY_USER_ID,
    facultyName: 'Dr. Rajesh Sharma',
    dayName: 'WEDNESDAY',
    startTime: '09:00 AM',
    endTime: '09:55 AM',
    timeRange: '09:00 - 09:55 AM',
    roomNumber: 'LT-204 (Block 1)',
    isLab: false,
    note: null,
    academicYear: '2026-27',
    semester: 3,
    sectionName: 'Section A',
  },
  {
    id: 'f0000001-0000-4000-8000-000000000004',
    courseOfferingId: DEV_OFFERING_ID,
    courseCode: 'CS302',
    courseTitle: 'Design & Analysis of Algorithms',
    facultyId: DEV_FACULTY_USER_ID,
    facultyName: 'Dr. Rajesh Sharma',
    dayName: 'THURSDAY',
    startTime: '10:00 AM',
    endTime: '10:55 AM',
    timeRange: '10:00 - 10:55 AM',
    roomNumber: 'LT-204 (Block 1)',
    isLab: false,
    note: null,
    academicYear: '2026-27',
    semester: 3,
    sectionName: 'Section A',
  },
];

export class TimetableRepository {
  /**
   * Retrieves timetable slots for courses that the given student is enrolled in
   */
  async getStudentSlots(
    studentUserId: string,
    filters: {
      day?: DayOfWeek;
      academicYear?: string;
      semester?: number;
    } = {}
  ): Promise<TimetableSlotDTO[]> {
    const effectiveStudentId =
      studentUserId === 'dev-student-uuid-001' ? DEV_STUDENT_USER_ID : studentUserId;

    try {
      const dbSlots = await prisma.timetableSlot.findMany({
        where: {
          courseOffering: {
            isActive: true,
            ...(filters.academicYear ? { academicYear: filters.academicYear } : {}),
            ...(filters.semester ? { semester: filters.semester } : {}),
            enrollments: {
              some: {
                studentId: effectiveStudentId,
              },
            },
          },
          ...(filters.day ? { dayName: filters.day } : {}),
        },
        include: {
          courseOffering: {
            include: {
              course: true,
              primaryFaculty: true,
              section: true,
            },
          },
        },
        orderBy: [{ dayName: 'asc' }, { startTime: 'asc' }],
      });

      return dbSlots.map((s) => ({
        id: s.id,
        courseOfferingId: s.courseOfferingId,
        courseCode: s.courseOffering.course.code,
        courseTitle: s.courseOffering.course.title,
        facultyId: s.courseOffering.primaryFacultyId,
        facultyName: s.courseOffering.primaryFaculty.fullName,
        dayName: s.dayName,
        startTime: s.startTime,
        endTime: s.endTime,
        timeRange: `${s.startTime} - ${s.endTime}`,
        roomNumber: s.roomNumber,
        isLab: s.isLab,
        note: s.note,
        academicYear: s.courseOffering.academicYear,
        semester: s.courseOffering.semester,
        sectionName: s.courseOffering.section.name,
      }));
    } catch (err) {
      logger.warn('timetable.repository: Live PostgreSQL student slots query failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
    }

    // Dev fixture fallback if database is offline during local test
    return MOCK_FIXTURE_SLOTS.filter((s) => {
      if (filters.day && s.dayName !== filters.day) return false;
      if (filters.academicYear && s.academicYear !== filters.academicYear) return false;
      if (filters.semester && s.semester !== filters.semester) return false;
      return true;
    });
  }

  /**
   * Retrieves timetable slots for courses assigned to the given faculty member
   */
  async getFacultySlots(
    facultyUserId: string,
    filters: {
      day?: DayOfWeek;
      academicYear?: string;
      semester?: number;
    } = {}
  ): Promise<TimetableSlotDTO[]> {
    const effectiveFacultyId =
      facultyUserId === 'dev-faculty-uuid-002' ? DEV_FACULTY_USER_ID : facultyUserId;

    try {
      const dbSlots = await prisma.timetableSlot.findMany({
        where: {
          courseOffering: {
            isActive: true,
            primaryFacultyId: effectiveFacultyId,
            ...(filters.academicYear ? { academicYear: filters.academicYear } : {}),
            ...(filters.semester ? { semester: filters.semester } : {}),
          },
          ...(filters.day ? { dayName: filters.day } : {}),
        },
        include: {
          courseOffering: {
            include: {
              course: true,
              primaryFaculty: true,
              section: true,
            },
          },
        },
        orderBy: [{ dayName: 'asc' }, { startTime: 'asc' }],
      });

      return dbSlots.map((s) => ({
        id: s.id,
        courseOfferingId: s.courseOfferingId,
        courseCode: s.courseOffering.course.code,
        courseTitle: s.courseOffering.course.title,
        facultyId: s.courseOffering.primaryFacultyId,
        facultyName: s.courseOffering.primaryFaculty.fullName,
        dayName: s.dayName,
        startTime: s.startTime,
        endTime: s.endTime,
        timeRange: `${s.startTime} - ${s.endTime}`,
        roomNumber: s.roomNumber,
        isLab: s.isLab,
        note: s.note,
        academicYear: s.courseOffering.academicYear,
        semester: s.courseOffering.semester,
        sectionName: s.courseOffering.section.name,
      }));
    } catch (err) {
      logger.warn('timetable.repository: Live PostgreSQL faculty slots query failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
    }

    // Dev fixture fallback if database is offline during local test
    return MOCK_FIXTURE_SLOTS.filter((s) => {
      if (filters.day && s.dayName !== filters.day) return false;
      if (filters.academicYear && s.academicYear !== filters.academicYear) return false;
      if (filters.semester && s.semester !== filters.semester) return false;
      return true;
    });
  }

  /**
   * Retrieves single timetable slot by ID
   */
  async getSlotById(slotId: string): Promise<TimetableSlotDTO | null> {
    try {
      const slot = await prisma.timetableSlot.findUnique({
        where: { id: slotId },
        include: {
          courseOffering: {
            include: {
              course: true,
              primaryFaculty: true,
              section: true,
            },
          },
        },
      });

      if (!slot) return null;

      return {
        id: slot.id,
        courseOfferingId: slot.courseOfferingId,
        courseCode: slot.courseOffering.course.code,
        courseTitle: slot.courseOffering.course.title,
        facultyId: slot.courseOffering.primaryFacultyId,
        facultyName: slot.courseOffering.primaryFaculty.fullName,
        dayName: slot.dayName,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timeRange: `${slot.startTime} - ${slot.endTime}`,
        roomNumber: slot.roomNumber,
        isLab: slot.isLab,
        note: slot.note,
        academicYear: slot.courseOffering.academicYear,
        semester: slot.courseOffering.semester,
        sectionName: slot.courseOffering.section.name,
      };
    } catch (err) {
      logger.warn('timetable.repository: Live PostgreSQL getSlotById failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
    }

    const fixture = MOCK_FIXTURE_SLOTS.find((s) => s.id === slotId);
    return fixture ?? null;
  }
}

export const timetableRepository = new TimetableRepository();
