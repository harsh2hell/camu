import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/env.js';
import { ServiceUnavailableError } from '../errors/AppError.js';
import type { CalendarEventDTO } from '../types/calendar.js';
import type { UserRole } from '@prisma/client';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatMonthYear(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

const DEV_CALENDAR_FIXTURES: CalendarEventDTO[] = [
  {
    id: 'cal-event-001',
    title: 'Continuous Assessment 1 (CA-1)',
    description: 'All undergraduate examinations begin on 22nd June 2026 across departmental halls.',
    category: 'EXAM',
    eventDate: '2026-06-22T09:30:00.000Z',
    monthYear: 'June 2026',
    isPinned: true,
    sourceType: 'NOTICE',
  },
  {
    id: 'cal-event-002',
    title: 'Annual University Research Conclave',
    description: 'Faculty and student paper presentations in the Himalayan Academic Amphitheatre.',
    category: 'EVENT',
    eventDate: '2026-08-15T10:00:00.000Z',
    monthYear: 'August 2026',
    isPinned: false,
    sourceType: 'NOTICE',
  },
  {
    id: 'cal-event-003',
    title: 'Mid-Semester Examinations (Odd Sem 2026-27)',
    description: 'Datesheet for B.Tech CSE released by Office of Controller of Examinations. Hall tickets require >= 75% attendance.',
    category: 'EXAM',
    eventDate: '2026-10-22T09:00:00.000Z',
    monthYear: 'October 2026',
    isPinned: true,
    sourceType: 'NOTICE',
  },
  {
    id: 'cal-event-004',
    title: 'Deepawali & Autumn Semester Recess',
    description: 'University campus remains closed for academic festivities and institutional break.',
    category: 'HOLIDAY',
    eventDate: '2026-11-01T00:00:00.000Z',
    monthYear: 'November 2026',
    isPinned: false,
    sourceType: 'NOTICE',
  },
];

export class CalendarRepository {
  /**
   * Retrieves unified academic calendar events for the user
   */
  async getEvents(
    userId: string,
    role: UserRole,
    filters: {
      category?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<CalendarEventDTO[]> {
    try {
      // 1. Query notices categorized as academic, exam, holiday, or event
      const allowedCategories =
        filters.category && filters.category !== 'ALL'
          ? [filters.category]
          : ['ACADEMIC', 'EXAM', 'HOLIDAY', 'EVENT'];

      const notices = await prisma.notice.findMany({
        where: {
          category: { in: allowedCategories },
          OR: [{ targetRole: null }, { targetRole: role }],
        },
        orderBy: [{ isPinned: 'desc' }, { eventDate: 'asc' }, { createdAt: 'desc' }],
      });

      const events: CalendarEventDTO[] = notices.map((n) => {
        const dateObj = n.eventDate ?? n.createdAt;
        return {
          id: n.id,
          title: n.title,
          description: n.content,
          category: (n.category as any) || 'ACADEMIC',
          eventDate: dateObj.toISOString(),
          monthYear: formatMonthYear(dateObj),
          isPinned: n.isPinned,
          sourceType: 'NOTICE',
        };
      });

      // 2. Query assignment deadlines if DEADLINE or ALL requested
      if (!filters.category || filters.category === 'ALL' || filters.category === 'DEADLINE') {
        const assignments = await prisma.assignment.findMany({
          where: {
            ...(role === 'STUDENT' ? { isPublished: true } : {}),
            courseOffering:
              role === 'STUDENT'
                ? {
                    enrollments: {
                      some: { studentId: userId },
                    },
                  }
                : {
                    primaryFacultyId: userId,
                  },
          },
          include: {
            courseOffering: {
              include: {
                course: true,
              },
            },
          },
          orderBy: { dueDate: 'asc' },
        });

        for (const a of assignments) {
          events.push({
            id: a.id,
            title: `Deadline: ${a.title}`,
            description: a.description || `Assignment submission for ${a.courseOffering.course.code}`,
            category: 'DEADLINE',
            eventDate: a.dueDate.toISOString(),
            monthYear: formatMonthYear(a.dueDate),
            isPinned: false,
            sourceType: 'ASSIGNMENT',
            metadata: {
              courseCode: a.courseOffering.course.code,
              courseTitle: a.courseOffering.course.title,
              totalMarks: a.totalMarks,
            },
          });
        }
      }

      // Sort chronological
      events.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

      // Filter by date window if provided
      let result = events;
      if (filters.startDate) {
        const start = new Date(filters.startDate).getTime();
        result = result.filter((e) => new Date(e.eventDate).getTime() >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate).getTime();
        result = result.filter((e) => new Date(e.eventDate).getTime() <= end);
      }

      return result;
    } catch (err) {
      logger.warn('calendar.repository: Live PostgreSQL events query failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
    }

    // Dev fixture fallback if database is offline during local test
    return DEV_CALENDAR_FIXTURES.filter((e) => {
      if (filters.category && filters.category !== 'ALL' && e.category !== filters.category) {
        return false;
      }
      return true;
    });
  }
}

export const calendarRepository = new CalendarRepository();
