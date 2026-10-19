import { calendarRepository } from '../repositories/calendar.repository.js';
import type { CalendarEventDTO } from '../types/calendar.js';
import type { UserRole } from '@prisma/client';

export class CalendarService {
  /**
   * Retrieves academic calendar events for the authenticated user
   */
  async getAcademicCalendar(
    userId: string,
    role: UserRole,
    filters: {
      category?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    events: CalendarEventDTO[];
    totalEvents: number;
    activeCategory: string;
  }> {
    const events = await calendarRepository.getEvents(userId, role, filters);

    return {
      events,
      totalEvents: events.length,
      activeCategory: filters.category || 'ALL',
    };
  }
}

export const calendarService = new CalendarService();
