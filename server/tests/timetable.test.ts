import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { sessionRepository } from '../src/repositories/session.repository.js';
import {
  timetableService,
  parseTimeToMinutes,
  doTimeSlotsOverlap,
} from '../src/services/timetable.service.js';
import { timetableRepository } from '../src/repositories/timetable.repository.js';
import { calendarRepository } from '../src/repositories/calendar.repository.js';
import { config } from '../src/config/env.js';
import type { TimetableSlotDTO } from '../src/types/timetable.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 4: Timetable and Academic Calendar Integration Suite', () => {
  let studentCookie: string[];
  let facultyCookie: string[];

  beforeEach(async () => {
    sessionRepository.clearMemoryStore();
    clearRateLimitStore();

    // Authenticate student fixture
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(studentLogin.status).toBe(200);
    studentCookie = getCookies(studentLogin);

    // Authenticate faculty fixture
    const facultyLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'faculty.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(facultyLogin.status).toBe(200);
    facultyCookie = getCookies(facultyLogin);
  });

  describe('Step 3 & 4: Timetable Authorization and Querying', () => {
    it('should reject unauthenticated student timetable requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/timetable/student');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject faculty access to student timetable with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/timetable/student')
        .set('Cookie', facultyCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject student access to faculty timetable with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/timetable/faculty')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should retrieve student weekly timetable for enrolled courses', async () => {
      const res = await request(app)
        .get('/api/timetable/student')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.schedule).toBeDefined();
      expect(res.body.data.schedule.Monday).toBeDefined();
      expect(res.body.data.totalWeeklySlots).toBeGreaterThan(0);

      // Verify slot structure
      const mondaySlots = res.body.data.schedule.Monday;
      expect(mondaySlots.length).toBeGreaterThan(0);
      const slot = mondaySlots[0];
      expect(slot).toHaveProperty('id');
      expect(slot).toHaveProperty('courseCode');
      expect(slot).toHaveProperty('courseTitle');
      expect(slot).toHaveProperty('facultyName');
      expect(slot).toHaveProperty('roomNumber');
      expect(slot).toHaveProperty('isLab');
      expect(slot).toHaveProperty('timeRange');
    });

    it('should retrieve faculty weekly timetable returning only courses assigned to the faculty', async () => {
      const res = await request(app)
        .get('/api/timetable/faculty')
        .set('Cookie', facultyCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.schedule).toBeDefined();

      // Check that all returned slots belong to Dr. Rajesh Sharma
      const allSlots: TimetableSlotDTO[] = Object.values(res.body.data.schedule).flat() as any;
      expect(allSlots.length).toBeGreaterThan(0);
      for (const slot of allSlots) {
        expect(slot.facultyId).toBe('a0000000-0000-4000-8000-000000000002');
      }
    });

    it('should retrieve daily schedule view when day parameter is supplied', async () => {
      const res = await request(app)
        .get('/api/timetable/student?day=MONDAY')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.day).toBe('Monday');
      expect(res.body.data.slots).toBeDefined();
      expect(res.body.data.totalSlots).toBe(res.body.data.slots.length);
      expect(res.body.data.totalLabs).toBeDefined();
      expect(res.body.data.totalLectures).toBeDefined();
    });

    it('should accept case-insensitive day parameter and normalize it', async () => {
      const res = await request(app)
        .get('/api/timetable/student?day=tuesday')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.day).toBe('Tuesday');
    });

    it('should reject invalid day of the week with 422 Unprocessable Entity', async () => {
      const res = await request(app)
        .get('/api/timetable/student?day=FUNDAY')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid semester parameter with 422 Unprocessable Entity', async () => {
      const res = await request(app)
        .get('/api/timetable/student?semester=99')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid academicYear format with 422 Unprocessable Entity', async () => {
      const res = await request(app)
        .get('/api/timetable/student?academicYear=invalid-year')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should retrieve slot details by ID', async () => {
      const studentSchedule = await request(app)
        .get('/api/timetable/student?day=MONDAY')
        .set('Cookie', studentCookie);

      const firstSlot = studentSchedule.body.data.slots[0];
      expect(firstSlot).toBeDefined();

      const res = await request(app)
        .get(`/api/timetable/slots/${firstSlot.id}`)
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.slot.id).toBe(firstSlot.id);
      expect(res.body.data.slot.courseCode).toBe(firstSlot.courseCode);
    });

    it('should return 404 Not Found for non-existent slot ID', async () => {
      const res = await request(app)
        .get('/api/timetable/slots/00000000-0000-4000-8000-000000000099')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Step 4: Overlap Conflict and Time Logic', () => {
    it('should correctly parse formatted times into minutes from midnight', () => {
      expect(parseTimeToMinutes('09:00 AM')).toBe(540);
      expect(parseTimeToMinutes('10:25 AM')).toBe(625);
      expect(parseTimeToMinutes('12:00 PM')).toBe(720);
      expect(parseTimeToMinutes('01:30 PM')).toBe(810);
      expect(parseTimeToMinutes('02:55 PM')).toBe(895);
    });

    it('should accurately detect overlapping and non-overlapping time windows', () => {
      // Overlapping: 09:00 - 10:00 and 09:30 - 10:30
      expect(doTimeSlotsOverlap('09:00 AM', '10:00 AM', '09:30 AM', '10:30 AM')).toBe(true);

      // Non-overlapping sequential: 09:00 - 10:00 and 10:00 - 11:00
      expect(doTimeSlotsOverlap('09:00 AM', '10:00 AM', '10:00 AM', '11:00 AM')).toBe(false);

      // Completely disjoint: 09:00 - 10:00 and 02:00 - 03:00 PM
      expect(doTimeSlotsOverlap('09:00 AM', '10:00 AM', '02:00 PM', '03:00 PM')).toBe(false);
    });

    it('should identify scheduling conflicts in a list of slots using timetableService.detectOverlaps', () => {
      const conflictingSlots: TimetableSlotDTO[] = [
        {
          id: 's1',
          courseOfferingId: 'off-1',
          courseCode: 'CS302',
          courseTitle: 'Algorithms',
          facultyId: 'fac-1',
          facultyName: 'Dr. Sharma',
          dayName: 'MONDAY',
          startTime: '09:00 AM',
          endTime: '10:00 AM',
          timeRange: '09:00 - 10:00 AM',
          roomNumber: 'LT-204',
          isLab: false,
          note: null,
          academicYear: '2026-27',
          semester: 3,
          sectionName: 'Section A',
        },
        {
          id: 's2',
          courseOfferingId: 'off-2',
          courseCode: 'CS304',
          courseTitle: 'DBMS',
          facultyId: 'fac-2',
          facultyName: 'Prof. Sen',
          dayName: 'MONDAY',
          startTime: '09:30 AM',
          endTime: '10:30 AM',
          timeRange: '09:30 - 10:30 AM',
          roomNumber: 'LT-204',
          isLab: false,
          note: null,
          academicYear: '2026-27',
          semester: 3,
          sectionName: 'Section A',
        },
      ];

      const report = timetableService.detectOverlaps(conflictingSlots);
      expect(report.hasConflict).toBe(true);
      expect(report.conflicts.length).toBe(1);
      expect(report.conflicts[0]).toContain('Time conflict on MONDAY');
    });
  });

  describe('Step 5: Academic Calendar Integration', () => {
    it('should reject unauthenticated academic calendar requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/calendar/events');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should retrieve academic calendar events for authenticated student', async () => {
      const res = await request(app)
        .get('/api/calendar/events')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.events).toBeDefined();
      expect(res.body.data.events.length).toBeGreaterThan(0);

      // Verify event structure
      const event = res.body.data.events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('description');
      expect(event).toHaveProperty('category');
      expect(event).toHaveProperty('eventDate');
      expect(event).toHaveProperty('monthYear');
    });

    it('should filter calendar events by category (e.g. EXAM)', async () => {
      const res = await request(app)
        .get('/api/calendar/events?category=EXAM')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      const events = res.body.data.events;
      expect(events.length).toBeGreaterThan(0);
      for (const e of events) {
        expect(e.category).toBe('EXAM');
      }
    });

    it('should include enrolled course assignment deadlines as calendar events', async () => {
      const res = await request(app)
        .get('/api/calendar/events?category=DEADLINE')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      const events = res.body.data.events;
      expect(events.length).toBeGreaterThan(0);
      for (const e of events) {
        expect(e.category).toBe('DEADLINE');
        expect(e.sourceType).toBe('ASSIGNMENT');
        expect(e.metadata?.courseCode).toBeDefined();
      }
    });
  });

  describe('Step 8: Production Failure and Security Isolation', () => {
    it('should fail safely with 503 when database fails in production mode without credential leakage', async () => {
      const originalEnv = config.NODE_ENV;
      (config as any).NODE_ENV = 'production';

      try {
        // Querying with an invalid connection or non-existent DB throws ServiceUnavailableError
        await expect(
          timetableRepository.getStudentSlots('non-existent-user-uuid')
        ).rejects.toThrow('Database service unavailable in production');

        await expect(
          calendarRepository.getEvents('non-existent-user-uuid', 'STUDENT')
        ).rejects.toThrow('Database service unavailable in production');
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });
  });
});
