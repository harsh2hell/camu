import { z } from 'zod';

export const calendarQuerySchema = z.object({
  category: z
    .enum(['EXAM', 'HOLIDAY', 'ACADEMIC', 'DEADLINE', 'EVENT', 'ALL'])
    .default('ALL'),
  startDate: z
    .string()
    .optional(),
  endDate: z
    .string()
    .optional(),
});

export interface CalendarEventDTO {
  id: string;
  title: string;
  description: string;
  category: 'EXAM' | 'HOLIDAY' | 'ACADEMIC' | 'DEADLINE' | 'EVENT';
  eventDate: string; // ISO string or YYYY-MM-DD
  monthYear: string; // e.g. "June 2026", "October 2026"
  isPinned: boolean;
  sourceType: 'NOTICE' | 'ASSIGNMENT';
  metadata?: {
    courseCode?: string;
    courseTitle?: string;
    totalMarks?: number;
    room?: string;
  };
}
