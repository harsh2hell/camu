import { timetableRepository } from '../repositories/timetable.repository.js';
import { NotFoundError } from '../errors/AppError.js';
import type { DayOfWeek } from '@prisma/client';
import type {
  TimetableSlotDTO,
  DailyScheduleDTO,
  WeeklyScheduleDTO,
} from '../types/timetable.js';

const ORDERED_DAYS: { key: DayOfWeek; display: string }[] = [
  { key: 'MONDAY', display: 'Monday' },
  { key: 'TUESDAY', display: 'Tuesday' },
  { key: 'WEDNESDAY', display: 'Wednesday' },
  { key: 'THURSDAY', display: 'Thursday' },
  { key: 'FRIDAY', display: 'Friday' },
  { key: 'SATURDAY', display: 'Saturday' },
];

/**
 * Parses time string like "09:00 AM" or "14:30" into total minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const trimmed = timeStr.trim().toUpperCase();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!ampmMatch) {
    // Attempt fallback or default 0
    return 0;
  }

  let hours = parseInt(ampmMatch[1], 10);
  const minutes = parseInt(ampmMatch[2], 10);
  const modifier = ampmMatch[3];

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Checks whether two time windows overlap
 */
export function doTimeSlotsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = parseTimeToMinutes(startA);
  const aEnd = parseTimeToMinutes(endA);
  const bStart = parseTimeToMinutes(startB);
  const bEnd = parseTimeToMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
}

export class TimetableService {
  /**
   * Retrieves student's timetable (daily or weekly)
   */
  async getStudentTimetable(
    studentUserId: string,
    query: {
      day?: DayOfWeek;
      academicYear?: string;
      semester?: number;
    }
  ): Promise<DailyScheduleDTO | WeeklyScheduleDTO> {
    const slots = await timetableRepository.getStudentSlots(studentUserId, query);

    if (query.day) {
      return this.formatDailySchedule(query.day, slots);
    }

    return this.formatWeeklySchedule(slots, query.academicYear, query.semester);
  }

  /**
   * Retrieves faculty's timetable (daily or weekly)
   */
  async getFacultyTimetable(
    facultyUserId: string,
    query: {
      day?: DayOfWeek;
      academicYear?: string;
      semester?: number;
    }
  ): Promise<DailyScheduleDTO | WeeklyScheduleDTO> {
    const slots = await timetableRepository.getFacultySlots(facultyUserId, query);

    if (query.day) {
      return this.formatDailySchedule(query.day, slots);
    }

    return this.formatWeeklySchedule(slots, query.academicYear, query.semester);
  }

  /**
   * Retrieves slot details by ID
   */
  async getSlotDetails(slotId: string): Promise<TimetableSlotDTO> {
    const slot = await timetableRepository.getSlotById(slotId);
    if (!slot) {
      throw new NotFoundError(`Timetable slot '${slotId}' not found.`);
    }
    return slot;
  }

  /**
   * Checks a set of timetable slots for overlapping schedules
   */
  detectOverlaps(slots: TimetableSlotDTO[]): { hasConflict: boolean; conflicts: string[] } {
    const conflicts: string[] = [];

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];

        if (a.dayName === b.dayName) {
          if (doTimeSlotsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
            conflicts.push(
              `Time conflict on ${a.dayName}: '${a.courseCode}' (${a.timeRange}) overlaps with '${b.courseCode}' (${b.timeRange}) in room '${a.roomNumber}'`
            );
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  private formatDailySchedule(day: DayOfWeek, slots: TimetableSlotDTO[]): DailyScheduleDTO {
    const dayEntry = ORDERED_DAYS.find((d) => d.key === day);
    const dayDisplay = dayEntry ? dayEntry.display : day;

    const filteredSlots = slots.filter((s) => s.dayName === day);
    const totalLabs = filteredSlots.filter((s) => s.isLab).length;
    const totalLectures = filteredSlots.filter((s) => !s.isLab).length;

    return {
      day: dayDisplay,
      slots: filteredSlots,
      totalSlots: filteredSlots.length,
      totalLabs,
      totalLectures,
    };
  }

  private formatWeeklySchedule(
    slots: TimetableSlotDTO[],
    academicYear?: string,
    semester?: number
  ): WeeklyScheduleDTO {
    const schedule: Record<string, TimetableSlotDTO[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    for (const slot of slots) {
      const match = ORDERED_DAYS.find((d) => d.key === slot.dayName);
      const displayDay = match ? match.display : slot.dayName;
      if (!schedule[displayDay]) {
        schedule[displayDay] = [];
      }
      schedule[displayDay].push(slot);
    }

    const defaultYear = slots[0]?.academicYear ?? academicYear ?? '2026-27';
    const defaultSemester = slots[0]?.semester ?? semester;

    return {
      academicYear: defaultYear,
      semester: defaultSemester,
      schedule,
      totalWeeklySlots: slots.length,
    };
  }
}

export const timetableService = new TimetableService();
