import { z } from 'zod';
import type { DayOfWeek } from '@prisma/client';

export const DayOfWeekEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
]);

export const studentTimetableQuerySchema = z.object({
  day: z
    .string()
    .optional()
    .transform((val) => (val ? (val.toUpperCase() as DayOfWeek) : undefined))
    .refine(
      (val) =>
        val === undefined ||
        ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].includes(val),
      { message: 'Invalid day of week. Must be MONDAY through SATURDAY.' }
    ),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{2,4}$/, 'Academic year must match format YYYY-YY (e.g. 2026-27)')
    .optional(),
  semester: z
    .coerce
    .number()
    .int('Semester must be an integer')
    .min(1, 'Semester must be between 1 and 12')
    .max(12, 'Semester must be between 1 and 12')
    .optional(),
});

export const facultyTimetableQuerySchema = z.object({
  day: z
    .string()
    .optional()
    .transform((val) => (val ? (val.toUpperCase() as DayOfWeek) : undefined))
    .refine(
      (val) =>
        val === undefined ||
        ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].includes(val),
      { message: 'Invalid day of week. Must be MONDAY through SATURDAY.' }
    ),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{2,4}$/, 'Academic year must match format YYYY-YY (e.g. 2026-27)')
    .optional(),
  semester: z
    .coerce
    .number()
    .int('Semester must be an integer')
    .min(1, 'Semester must be between 1 and 12')
    .max(12, 'Semester must be between 1 and 12')
    .optional(),
});

export const slotParamsSchema = z.object({
  id: z.string().uuid('Invalid slot ID format'),
});

export interface TimetableSlotDTO {
  id: string;
  courseOfferingId: string;
  courseCode: string;
  courseTitle: string;
  facultyId: string;
  facultyName: string;
  dayName: DayOfWeek;
  startTime: string;
  endTime: string;
  timeRange: string;
  roomNumber: string;
  isLab: boolean;
  note: string | null;
  academicYear: string;
  semester: number;
  sectionName: string;
  status?: 'completed' | 'ongoing' | 'upcoming';
}

export interface DailyScheduleDTO {
  day: string;
  slots: TimetableSlotDTO[];
  totalSlots: number;
  totalLabs: number;
  totalLectures: number;
}

export interface WeeklyScheduleDTO {
  academicYear: string;
  semester?: number;
  schedule: Record<string, TimetableSlotDTO[]>;
  totalWeeklySlots: number;
}
